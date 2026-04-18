import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface SmsPayload {
  phone: string;
  message: string;
  event_type?: string;
  user_id?: string;
}

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "send-sms");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const payload: SmsPayload = await req.json();
    const { phone, message, event_type = "transactional", user_id } = payload;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!E164_REGEX.test(phone)) {
      return new Response(
        JSON.stringify({ error: "phone must be in E.164 format (e.g., +33612345678)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (message.length > 1600) {
      return new Response(
        JSON.stringify({ error: "message too long (max 1600 chars)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";

    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
      console.error("[sms] TWILIO credentials not configured");
      await supabase.from("sms_log").insert({
        phone,
        message: message.substring(0, 500),
        event_type,
        user_id: user_id ?? null,
        status: "config_missing",
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: "SMS provider not configured", delivered: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const twilioBody = new URLSearchParams({
      To: phone,
      From: TWILIO_FROM,
      Body: message.substring(0, 1600),
    });

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: twilioBody.toString(),
      }
    );

    const twilioResult = await resp.json();

    await supabase.from("sms_log").insert({
      phone,
      message: message.substring(0, 500),
      event_type,
      user_id: user_id ?? null,
      status: resp.ok ? "sent" : "failed",
      twilio_sid: twilioResult.sid ?? null,
      error_message: resp.ok ? null : (twilioResult.message ?? `HTTP ${resp.status}`),
    }).catch((e: unknown) => {
      console.error("[sms] Failed to log SMS:", e);
    });

    if (!resp.ok) {
      console.error(`[sms] Twilio error: ${resp.status}`, twilioResult);
      return new Response(
        JSON.stringify({ error: twilioResult.message ?? "SMS delivery failed", delivered: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "sms_notifications",
      p_status: "green",
      p_error_message: null,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ delivered: true, sid: twilioResult.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sms] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
