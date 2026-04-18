import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// LB1 Track 1 (#841) — ops-ai-chat now goes through the platform agent
// registry. Direct `openaiChat` is no longer permitted on this surface; every
// call is governed (quota, sensitive routing, audit) and persisted to
// `system.execution_tasks` + `ai_interactions` by the AI adapter.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const outcome = await dispatchAiCompletion(
      {
        feature: "ops-ai-chat",
        messages: [
          {
            role: "system",
            content:
              "You are an operational AI assistant for a platform managing rides, deliveries, marketplace, property, and support. Give concise, practical, execution-first answers. When asked about disputes, refunds, payouts, or fraud, provide specific actionable recommendations.",
          },
          ...messages,
        ],
        purpose: "general",
      },
      { feature: "ops-ai-chat" },
    );

    if (outcome.status === "succeeded" && outcome.output) {
      const it = outcome.output.interaction;
      return new Response(
        JSON.stringify({
          answer: outcome.output.text ?? "",
          usage: {
            prompt_tokens: it.promptTokens,
            completion_tokens: it.completionTokens,
            total_tokens: it.promptTokens + it.completionTokens,
          },
          model: it.model ?? "gpt-4o-mini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Preserve legacy ops-ai-chat contract: 429 / 402 / 500.
    const msg = outcome.errorMessage ?? outcome.blockedReason ?? "";
    console.error(
      "[ops-ai-chat] dispatch outcome:",
      outcome.status,
      outcome.errorCode,
      msg,
    );
    if (outcome.errorCode === "AI_QUOTA_EXCEEDED") {
      return new Response(
        JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (/\b402\b|payment\s*required|insufficient.*quota/i.test(msg)) {
      return new Response(
        JSON.stringify({ error: "Payment required, please add funds." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: "OpenAI API error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ops-ai-chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
