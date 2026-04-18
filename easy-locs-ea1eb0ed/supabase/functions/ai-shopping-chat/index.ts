import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
// LB1 #835 — shopping chat goes through the platform-native AI agent so quota
// / sensitive routing / audit are enforced. Direct `aiRouteAndParse` is no
// longer permitted on this surface.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const { messages, system } = await req.json();

    let reply: string;
    try {
      const outcome = await dispatchAiCompletion(
        {
          feature: "ai-shopping-chat",
          messages: [
            { role: "system", content: system },
            ...messages,
          ],
          maxTokens: 500,
        },
        { feature: "ai-shopping-chat" },
      );

      if (outcome.status === "succeeded" && outcome.output?.text) {
        reply = outcome.output.text;
      } else if (outcome.status === "pending_review") {
        // The completion was held by the sensitive-output guard. Surface a
        // friendly placeholder; an operator can release the result via the
        // approvals inbox.
        reply = "I need a moment to review my response. An advisor will follow up shortly.";
      } else {
        console.error(
          "[ai-shopping-chat] dispatch outcome:",
          outcome.status,
          outcome.errorCode,
          outcome.errorMessage ?? outcome.blockedReason,
        );
        reply = "I couldn't process that. Could you rephrase?";
      }
    } catch (err) {
      console.error("AI dispatch error:", err);
      reply = "I'm having trouble thinking right now. Please try again!";
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ reply: "Something went wrong. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
