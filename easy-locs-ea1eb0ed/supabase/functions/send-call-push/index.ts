import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface CallPushPayload {
  receiver_user_id: string;
  call_id: string;
  caller_name: string;
  caller_avatar_url?: string;
  call_type: "audio" | "video";
  conversation_id?: string;
  action: "incoming" | "missed" | "ended";
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  try {
    const rlResult = await checkServerRateLimit(req, "send-call-push");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const payload: CallPushPayload = await req.json();
    const { receiver_user_id, call_id, caller_name, caller_avatar_url, call_type, conversation_id, action } = payload;

    if (!receiver_user_id || !call_id || !caller_name) {
      return new Response(
        JSON.stringify({ error: "receiver_user_id, call_id, and caller_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const callerUserId = authCheck.userId;
    if (conversation_id) {
      const { data: participant } = await supabase
        .from("conversation_participants_v2")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", callerUserId)
        .maybeSingle();

      if (!participant) {
        return new Response(
          JSON.stringify({ error: "Not authorized: caller is not a participant in this conversation" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { data: callLog } = await supabase
        .from("call_logs")
        .select("caller_id, callee_id")
        .eq("id", call_id)
        .maybeSingle();

      if (!callLog || (callLog.caller_id !== callerUserId && callLog.callee_id !== callerUserId)) {
        return new Response(
          JSON.stringify({ error: "Not authorized: caller is not a participant in this call" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const callTypeLabel = call_type === "video" ? "Video" : "Voice";
    let title: string;
    let body: string;
    let eventType: string;

    switch (action) {
      case "incoming":
        title = `Incoming ${callTypeLabel} Call`;
        body = `${caller_name} is calling you`;
        eventType = "incoming_call";
        break;
      case "missed":
        title = `Missed ${callTypeLabel} Call`;
        body = `You missed a call from ${caller_name}`;
        eventType = "missed_call";
        break;
      case "ended":
        title = `${callTypeLabel} Call Ended`;
        body = `Call with ${caller_name} has ended`;
        eventType = "call_ended";
        break;
      default:
        title = `${callTypeLabel} Call`;
        body = `Call from ${caller_name}`;
        eventType = "call_notification";
    }

    const { data: result, error: invokeError } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: {
          user_id: receiver_user_id,
          title,
          body,
          event_type: eventType,
          data: {
            event_type: eventType,
            call_id,
            caller_name,
            caller_avatar_url: caller_avatar_url || "",
            call_type,
            conversation_id: conversation_id || "",
            action_accept: action === "incoming" ? "true" : "false",
            action_decline: action === "incoming" ? "true" : "false",
            require_interaction: action === "incoming" ? "true" : "false",
            priority: "high",
          },
        },
      }
    );

    if (invokeError) {
      console.error("[send-call-push] Push invocation error:", invokeError);
      return new Response(
        JSON.stringify({ success: false, error: invokeError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-call-push] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
