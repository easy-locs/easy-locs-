import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_EXPIRY_MINUTES = 10;
const MAX_SESSIONS_PER_30_MIN = 5;

type OtpChannel = "sms" | "whatsapp";

function isMockMode(): boolean {
  const flag = (Deno.env.get("OTP_MOCK_MODE") || "").toLowerCase();
  const explicitOn = flag === "true" || flag === "1" || flag === "yes";
  const explicitOff = flag === "false" || flag === "0" || flag === "no";
  const isProduction = Deno.env.get("ENVIRONMENT") === "production";

  if (explicitOff) return false;
  if (explicitOn) {
    if (isProduction) {
      console.error(
        "[send-otp] OTP_MOCK_MODE=true is not allowed in production — ignoring and requiring real Twilio delivery.",
      );
      return false;
    }
    return true;
  }
  // Auto-fallback to mock only outside production, and only when Twilio is unconfigured.
  if (isProduction) {
    if (!isTwilioConfigured() && !isWhatsAppConfigured()) {
      console.error(
        "[send-otp] Twilio is not configured in production. OTP delivery will fail — set TWILIO_* secrets.",
      );
    }
    return false;
  }
  return !isTwilioConfigured() && !isWhatsAppConfigured();
}

function logMockOtp(phone: string, otp: string, channel: OtpChannel): void {
  const banner = "=".repeat(60);
  console.log(banner);
  console.log(`[send-otp][MOCK] ${channel.toUpperCase()} delivery disabled — Twilio not in use.`);
  console.log(`[send-otp][MOCK] Phone:  ${phone}`);
  console.log(`[send-otp][MOCK] Code:   ${otp}`);
  console.log(`[send-otp][MOCK] Expiry: ${OTP_EXPIRY_MINUTES} minutes`);
  console.log(banner);
}

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const envSalt = Deno.env.get("OTP_HASH_SALT");
  if (!envSalt && Deno.env.get("ENVIRONMENT") === "production") {
    throw new Error("OTP_HASH_SALT must be set in production");
  }
  const salt = envSalt || "_easylocs_salt_v1";
  const data = encoder.encode(otp + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isTwilioConfigured(): boolean {
  return !!(
    Deno.env.get("TWILIO_ACCOUNT_SID") &&
    Deno.env.get("TWILIO_AUTH_TOKEN") &&
    Deno.env.get("TWILIO_FROM_NUMBER")
  );
}

function isWhatsAppConfigured(): boolean {
  return !!(
    Deno.env.get("TWILIO_ACCOUNT_SID") &&
    Deno.env.get("TWILIO_AUTH_TOKEN") &&
    (Deno.env.get("TWILIO_WHATSAPP_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER"))
  );
}

function getAvailableChannels(): OtpChannel[] {
  if (isMockMode()) return ["sms", "whatsapp"];
  const channels: OtpChannel[] = [];
  if (isTwilioConfigured()) channels.push("sms");
  if (isWhatsAppConfigured()) channels.push("whatsapp");
  return channels;
}

async function sendViaTwilio(
  phone: string,
  otp: string,
  channel: OtpChannel
): Promise<{ sent: boolean; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;

  let from: string;
  let to: string;

  if (channel === "whatsapp") {
    const whatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER")!;
    from = `whatsapp:${whatsappNumber}`;
    to = `whatsapp:${phone}`;
  } else {
    from = Deno.env.get("TWILIO_FROM_NUMBER")!;
    to = phone;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `Votre code Easy-Locs : ${otp}. Valable ${OTP_EXPIRY_MINUTES} minutes.`,
  });

  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[send-otp] Twilio ${channel} error:`, res.status, errBody);
      return { sent: false, error: `TWILIO_SEND_FAILED` };
    }

    console.log(`[send-otp] ${channel.toUpperCase()} sent to:`, phone);
    return { sent: true };
  } catch (err) {
    console.error(`[send-otp] Twilio ${channel} request failed:`, err);
    return { sent: false, error: "TWILIO_REQUEST_FAILED" };
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const __qsCheck = rejectQuerySecrets(req, corsHeaders); if (__qsCheck.rejected) return __qsCheck.response!;

  try {
    const rlResult = await checkServerRateLimit(req, "send-otp");
    if (!rlResult.allowed) {
      const rl = rateLimitResponse(rlResult);
      const merged = new Headers(rl.headers);
      for (const [k, v] of Object.entries(corsHeaders)) merged.set(k, v);
      return new Response(rl.body, { status: rl.status, headers: merged });
    }

    const body = await req.json();
    const { phone, probe, channel: requestedChannel } = body;

    if (probe) {
      const mock = isMockMode();
      const channels = getAvailableChannels();
      return jsonResponse({
        configured: channels.length > 0,
        channels,
        sms: mock ? true : isTwilioConfigured(),
        whatsapp: mock ? true : isWhatsAppConfigured(),
        mock,
      });
    }

    if (!phone) {
      return jsonResponse({ error: "phone required" }, 400);
    }

    const availableChannels = getAvailableChannels();
    if (availableChannels.length === 0) {
      return jsonResponse({
        success: false,
        error_code: "SMS_NOT_CONFIGURED",
        message: "SMS/WhatsApp service is not configured.",
      }, 503);
    }

    const channel: OtpChannel =
      requestedChannel === "whatsapp" && availableChannels.includes("whatsapp")
        ? "whatsapp"
        : availableChannels.includes("sms")
          ? "sms"
          : availableChannels[0];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentSessions } = await supabase
      .from("phone_otp_sessions")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", cutoff);

    if ((recentSessions?.length ?? 0) >= MAX_SESSIONS_PER_30_MIN) {
      return jsonResponse({
        success: false,
        error_code: "RATE_LIMITED",
        message: "Too many verification attempts. Please wait.",
      }, 429);
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from("phone_otp_sessions")
      .insert({
        phone,
        otp_hash: otpHash,
        otp_code: null,
        status: "pending",
        attempts: 0,
        attempt_count: 0,
        expires_at: expiresAt,
      });

    if (insertErr) {
      console.error("[send-otp] DB insert error:", insertErr);
      return jsonResponse({ success: false, error_code: "DB_ERROR" }, 500);
    }

    if (isMockMode()) {
      logMockOtp(phone, otp, channel);
      return jsonResponse({ success: true, channel, mock: true });
    }

    const result = await sendViaTwilio(phone, otp, channel);

    if (!result.sent) {
      if (channel === "whatsapp" && availableChannels.includes("sms")) {
        console.warn("[send-otp] WhatsApp failed, falling back to SMS");
        const smsResult = await sendViaTwilio(phone, otp, "sms");
        if (smsResult.sent) {
          return jsonResponse({ success: true, channel: "sms", fallback: true });
        }
      }

      return jsonResponse({
        success: false,
        error_code: "SMS_SEND_FAILED",
        message: `Failed to send ${channel === "whatsapp" ? "WhatsApp" : "SMS"}.`,
      }, 502);
    }

    return jsonResponse({ success: true, channel });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-otp] error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
