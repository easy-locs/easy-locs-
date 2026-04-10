import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function getEnv(name: string, fallback = ""): string {
  return Deno.env.get(name) ?? fallback;
}

async function hmacSha1Base64(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const TURN_MODE = getEnv("TURN_MODE", "metered");
    const TURN_TTL_SECONDS = Number(getEnv("TURN_TTL_SECONDS", "3600"));

    const stunServers = [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ];

    if (TURN_MODE === "metered") {
      const host = getEnv("METERED_TURN_HOST", "global.relay.metered.ca");
      const username = getEnv("METERED_TURN_USERNAME");
      const credential = getEnv("METERED_TURN_PASSWORD");

      if (!username || !credential) {
        return json({ ok: false, mode: "metered", reason: "missing_metered_credentials", iceServers: stunServers });
      }

      return json({
        ok: true,
        mode: "metered",
        ttlSeconds: 600,
        iceServers: [
          ...stunServers,
          {
            urls: [
              `turn:${host}:80`,
              `turn:${host}:80?transport=tcp`,
              `turn:${host}:443`,
              `turn:${host}:443?transport=tcp`,
            ],
            username,
            credential,
          },
        ],
      });
    }

    if (TURN_MODE === "coturn") {
      const host = getEnv("TURN_HOST");
      const secret = getEnv("TURN_SECRET");

      if (!host || !secret) {
        return json({ ok: false, mode: "coturn", reason: "missing_turn_host_or_secret", iceServers: stunServers });
      }

      const expiry = Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS;
      const userId = crypto.randomUUID().slice(0, 12);
      const username = `${expiry}:${userId}`;
      const credential = await hmacSha1Base64(secret, username);

      return json({
        ok: true,
        mode: "coturn",
        ttlSeconds: TURN_TTL_SECONDS,
        iceServers: [
          ...stunServers,
          {
            urls: [
              `turn:${host}:3478?transport=udp`,
              `turn:${host}:3478?transport=tcp`,
              `turns:${host}:5349?transport=tcp`,
            ],
            username,
            credential,
          },
        ],
      });
    }

    return json({ ok: false, reason: "invalid_turn_mode", iceServers: stunServers }, 400);
  } catch (e: any) {
    return json({
      ok: false,
      reason: "unexpected_error",
      error: e?.message ?? String(e),
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    }, 500);
  }
});
