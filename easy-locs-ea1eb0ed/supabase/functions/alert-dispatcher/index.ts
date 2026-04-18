import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface AlertPayload {
  alert_type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  source_system?: string;
}

const THROTTLE_MINUTES = 15;
const FLOOD_WINDOW_MINUTES = 60;
const FLOOD_THRESHOLD = 5;

async function sendSmsAlert(to: string, title: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";

  if (!accountSid || !authToken || !fromNumber) {
    console.error("[alert] SMS delivery failed: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER env vars are required");
    return false;
  }

  try {
    const body = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: `[ALERT] ${title}: ${message}`.substring(0, 1600),
    });

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`[alert] Twilio SMS failed: HTTP ${resp.status} — ${errText}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[alert] SMS send error:", e);
    return false;
  }
}

async function sendEmailAlert(target: string, title: string, message: string, supabaseUrl: string, supabaseKey: string): Promise<boolean> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: target,
        subject: `[ALERT] ${title}`,
        html: `<h2>${title}</h2><p>${message}</p><p>Time: ${new Date().toISOString()}</p>`,
      }),
    });
    return resp.ok;
  } catch (e) {
    console.error("[alert] email send failed:", e);
    return false;
  }
}

async function sendTelegramAlert(botToken: string, chatId: string, title: string, message: string): Promise<boolean> {
  if (!botToken || !chatId) return false;
  try {
    const text = `🚨 *${title}*\n${message}\n_${new Date().toISOString()}_`;
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    return resp.ok;
  } catch (e) {
    console.error("[alert] telegram send failed:", e);
    return false;
  }
}

async function sendWebhookAlert(url: string, payload: AlertPayload): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
    });
    return resp.ok;
  } catch (e) {
    console.error("[alert] webhook send failed:", e);
    return false;
  }
}

Deno.serve(withEdgeLogging("alert-dispatcher", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;
  logger.info("alert_dispatch_started", { method: req.method });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "alert-dispatcher", { maxRequests: 30, windowSeconds: 60 });
    if (!rlResult.allowed) {
      await supabase.rpc("update_autonomy_status", {
        p_system_name: "rate_limiter",
        p_status: "green",
      }).catch((e: unknown) => {
        console.error("[alert] rate limiter status update failed:", e);
      });
      return rateLimitResponse(rlResult);
    }

    const payload: AlertPayload = await req.json();
    const { alert_type, severity, title, message, source_system } = payload;

    if (!alert_type || !title) {
      return new Response(
        JSON.stringify({ error: "alert_type and title required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const throttleCutoff = new Date(Date.now() - THROTTLE_MINUTES * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from("admin_alert_log")
      .select("id")
      .eq("alert_type", alert_type)
      .eq("status", "sent")
      .gte("created_at", throttleCutoff)
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      await supabase.from("admin_alert_log").insert({
        alert_type,
        severity,
        title,
        message,
        source_system,
        status: "throttled",
      });

      return new Response(
        JSON.stringify({ status: "throttled", reason: `Same alert sent within ${THROTTLE_MINUTES} minutes` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const floodCutoff = new Date(Date.now() - FLOOD_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: floodCount } = await supabase
      .from("admin_alert_log")
      .select("id", { count: "exact", head: true })
      .eq("alert_type", alert_type)
      .gte("created_at", floodCutoff);

    if ((floodCount ?? 0) >= FLOOD_THRESHOLD) {
      await supabase.from("admin_alert_log").insert({
        alert_type,
        severity,
        title,
        message,
        source_system,
        status: "flood_suppressed",
      });

      logger.warn("alert_flood_suppressed", {
        alert_type,
        count_in_window: floodCount,
        window_minutes: FLOOD_WINDOW_MINUTES,
      });

      return new Response(
        JSON.stringify({ status: "flood_suppressed", reason: `${floodCount} alerts of type '${alert_type}' in last ${FLOOD_WINDOW_MINUTES}min — suppressed` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: channels } = await supabase
      .from("admin_alert_channels")
      .select("*")
      .eq("is_active", true)
      .contains("severity_filter", [severity]);

    let sent = 0;
    let failed = 0;

    for (const channel of channels ?? []) {
      let success = false;

      switch (channel.channel_type) {
        case "email":
          success = await sendEmailAlert(channel.channel_target, title, message, supabaseUrl, supabaseKey);
          break;
        case "telegram":
          success = await sendTelegramAlert(telegramBotToken, channel.channel_target, title, message);
          break;
        case "webhook":
          success = await sendWebhookAlert(channel.channel_target, payload);
          break;
        case "sms":
          success = await sendSmsAlert(channel.channel_target, title, message);
          break;
      }

      await supabase.from("admin_alert_log").insert({
        alert_type,
        severity,
        title,
        message,
        source_system,
        channel_type: channel.channel_type,
        channel_target: channel.channel_target,
        status: success ? "sent" : "failed",
      });

      if (success) sent++;
      else failed++;
    }

    if ((channels ?? []).length === 0) {
      await supabase.from("admin_alert_log").insert({
        alert_type,
        severity,
        title,
        message,
        source_system,
        status: "sent",
      });
      console.log(`[alert] No channels configured. Alert logged: ${title}`);
    }

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "alert_engine",
      p_status: failed === 0 ? "green" : "yellow",
      p_error_message: failed > 0 ? `${failed} channel(s) failed` : null,
    }).catch((e: unknown) => {
      console.error("[alert] autonomy status update failed:", e);
    });

    return new Response(
      JSON.stringify({ sent, failed, total_channels: channels?.length ?? 0, throttled: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}));
