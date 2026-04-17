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
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      return new Response(
        JSON.stringify({
          answer: outcome.output.text ?? "",
          usage: {
            prompt_tokens: outcome.output.interaction.promptTokens,
            completion_tokens: outcome.output.interaction.completionTokens,
            total_tokens:
              outcome.output.interaction.promptTokens +
              outcome.output.interaction.completionTokens,
          },
          model: outcome.output.interaction.model,
          task_id: outcome.taskId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (outcome.status === "pending_review") {
      return new Response(
        JSON.stringify({
          status: "pending_review",
          task_id: outcome.taskId,
          reason: outcome.blockedReason,
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const httpStatus =
      outcome.status === "timeout" ? 504 :
      outcome.errorCode === "AI_QUOTA_EXCEEDED" ? 429 :
      (outcome.status === "blocked" || outcome.status === "rejected") ? 403 :
      500;

    console.error(
      "[ops-ai-chat] dispatch outcome:",
      outcome.status,
      outcome.errorCode,
      outcome.errorMessage ?? outcome.blockedReason,
    );
    return new Response(
      JSON.stringify({
        error: outcome.errorMessage ?? outcome.blockedReason ?? "AI dispatch failed",
        error_code: outcome.errorCode,
        task_id: outcome.taskId,
      }),
      { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ops-ai-chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
