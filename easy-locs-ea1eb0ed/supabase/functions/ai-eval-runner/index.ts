// Next-Gen IA — automated evaluation runner against golden sets.
// Service-role only. POST body:
//   { runLabel: string, feature?: string, limit?: number, provider?: "openai"|"anthropic" }
// Output: { total, passed, failed, results: [...] }

import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { aiRoute } from "../_shared/ai-router.ts";
import { estimateCost } from "../_shared/ai-cost-tracker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoldenExpected {
  type: "contains" | "regex" | "equals" | "json_has";
  value: string;
  flags?: string;
}

interface GoldenRow {
  id: string;
  name: string;
  feature: string;
  domain: string | null;
  input: { messages?: Array<{ role: string; content: string }>; prompt?: string };
  expected: GoldenExpected | GoldenExpected[];
}

function jsonPathExists(root: unknown, path: string): boolean {
  const segments = path.split(".");
  let cursor: unknown = root;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) return false;
    if (typeof cursor !== "object") return false;
    const record = cursor as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, segment)) return false;
    cursor = record[segment];
  }
  return cursor !== undefined;
}

function checkExpectation(output: string, expected: GoldenExpected): boolean {
  try {
    switch (expected.type) {
      case "contains":
        return output.toLowerCase().includes(expected.value.toLowerCase());
      case "regex":
        return new RegExp(expected.value, expected.flags ?? "i").test(output);
      case "equals":
        return output.trim() === expected.value.trim();
      case "json_has": {
        const parsed: unknown = JSON.parse(output);
        return jsonPathExists(parsed, expected.value);
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const runLabel: string = body.runLabel ?? `run-${new Date().toISOString()}`;
    const feature: string | undefined = body.feature;
    const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 500);
    const preferred = body.provider as "openai" | "anthropic" | undefined;

    let query = db.from("ai_golden_sets").select("*").eq("active", true).limit(limit);
    if (feature) query = query.eq("feature", feature);
    const { data: golden, error } = await query;
    if (error) throw error;

    const results: Array<{
      golden_id: string; name: string; passed: boolean; score: number; output?: string; error?: string;
    }> = [];

    let passedCount = 0;

    for (const g of (golden ?? []) as GoldenRow[]) {
      const start = Date.now();
      try {
        const messages = g.input.messages
          ?? [{ role: "user", content: g.input.prompt ?? "" }];
        const { response, provider, fallbackUsed } = await aiRoute({
          messages, max_tokens: 800, temperature: 0.2,
          preferredProvider: preferred ?? "auto",
        });
        if (!response.ok) {
          const errText = await response.text();
          const latency = Date.now() - start;
          await db.from("ai_eval_runs").insert({
            run_label: runLabel, feature: g.feature, golden_id: g.id,
            provider, model: null, passed: false, score: 0,
            error: `provider_${response.status}: ${errText.slice(0, 400)}`,
            latency_ms: latency, cost_usd: 0,
          });
          results.push({ golden_id: g.id, name: g.name, passed: false, score: 0, error: `provider_${response.status}` });
          continue;
        }

        const data = await response.json();
        let output = "";
        let model = "";
        let promptTokens = 0;
        let completionTokens = 0;
        if (provider === "anthropic") {
          const content = data.content as Array<{ type: string; text?: string }>;
          output = content?.find((b) => b.type === "text")?.text ?? "";
          model = data.model ?? "claude-3-5-haiku-20241022";
          promptTokens = data.usage?.input_tokens ?? 0;
          completionTokens = data.usage?.output_tokens ?? 0;
        } else {
          output = data.choices?.[0]?.message?.content ?? "";
          model = data.model ?? "gpt-4o-mini";
          promptTokens = data.usage?.prompt_tokens ?? 0;
          completionTokens = data.usage?.completion_tokens ?? 0;
        }

        const expectations = Array.isArray(g.expected) ? g.expected : [g.expected];
        const checks = expectations.map((e) => checkExpectation(output, e));
        const score = checks.length ? checks.filter(Boolean).length / checks.length : 0;
        const passed = score >= 1;
        if (passed) passedCount++;

        const latency = Date.now() - start;
        const cost = estimateCost(model, promptTokens, completionTokens);

        await db.from("ai_eval_runs").insert({
          run_label: runLabel, feature: g.feature, golden_id: g.id,
          provider, model, passed, score,
          actual_output: { text: output.slice(0, 4000), fallback_used: fallbackUsed },
          latency_ms: latency, cost_usd: cost,
        });

        results.push({ golden_id: g.id, name: g.name, passed, score, output: output.slice(0, 500) });
      } catch (err) {
        const latency = Date.now() - start;
        const msg = err instanceof Error ? err.message : String(err);
        await db.from("ai_eval_runs").insert({
          run_label: runLabel, feature: g.feature, golden_id: g.id,
          provider: null, model: null, passed: false, score: 0,
          error: msg.slice(0, 400), latency_ms: latency, cost_usd: 0,
        });
        results.push({ golden_id: g.id, name: g.name, passed: false, score: 0, error: msg });
      }
    }

    return new Response(JSON.stringify({
      runLabel,
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-eval-runner] error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
