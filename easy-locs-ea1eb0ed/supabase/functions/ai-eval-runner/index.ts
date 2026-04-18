// Next-Gen IA — automated evaluation runner against golden sets.
// Service-role only. POST body:
//   { runLabel: string, feature?: string, limit?: number, provider?: "openai"|"anthropic" }
// Output: { total, passed, failed, results: [...] }

import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";
import { estimateCost } from "../_shared/ai-cost-tracker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
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
    // body.provider is ACCEPTED for backwards-compat but IGNORED — Track 2
    // (#842) routes every call through the registered ai.completion agent;
    // provider selection is governed by metadata.router on that agent.
    const _preferredIgnored = body.provider as "openai" | "anthropic" | undefined;
    void _preferredIgnored;

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
        const messages = (g.input.messages
          ?? [{ role: "user", content: g.input.prompt ?? "" }]) as Array<
            { role: "system" | "user" | "assistant"; content: string }
          >;
        const aiOutcome = await dispatchAiCompletion(
          {
            feature: "ai-eval-runner",
            messages,
            maxTokens: 800,
            temperature: 0.2,
            purpose: "general",
          },
          { feature: "ai-eval-runner", correlationId: runLabel },
        );
        if (aiOutcome.status !== "succeeded" || !aiOutcome.output) {
          const latency = Date.now() - start;
          await db.from("ai_eval_runs").insert({
            run_label: runLabel, feature: g.feature, golden_id: g.id,
            provider: null, model: null, passed: false, score: 0,
            error: `dispatch_${aiOutcome.status}:${aiOutcome.errorCode ?? "unknown"}`.slice(0, 400),
            latency_ms: latency, cost_usd: 0,
          });
          results.push({
            golden_id: g.id, name: g.name, passed: false, score: 0,
            error: `dispatch_${aiOutcome.status}`,
          });
          continue;
        }

        const interaction = aiOutcome.output.interaction;
        const output = aiOutcome.output.text;
        const model = interaction.model;
        const promptTokens = interaction.promptTokens;
        const completionTokens = interaction.completionTokens;
        // Legacy ai_eval_runs.provider column is bi-valued — map "internal"
        // (new transport) back to its underlying "openai" default.
        const provider: "openai" | "anthropic" =
          interaction.provider === "anthropic" ? "anthropic" : "openai";
        const fallbackUsed = interaction.fallbackUsed;

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
