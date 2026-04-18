import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const GUEST_TTL_SECONDS = 300;
const AUTH_TTL_SECONDS = 3600;

const STUN_SERVERS: Array<Record<string, unknown>> = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function hasTurnServers(servers: Array<Record<string, unknown>>): boolean {
  return servers.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u: string) => typeof u === "string" && (u.startsWith("turn:") || u.startsWith("turns:")));
  });
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "get-turn-credentials");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    let isGuest = false;
    let userId = "guest";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        isGuest = true;
      } else {
        userId = user.id;
      }
    } else {
      isGuest = true;
    }

    const ttlSeconds = isGuest ? GUEST_TTL_SECONDS : AUTH_TTL_SECONDS;
    const turnProvider = Deno.env.get("TURN_PROVIDER") || "hmac";
    let iceServers: Array<Record<string, unknown>>;
    let provider: string;

    try {
      if (turnProvider === "twilio") {
        iceServers = await fetchTwilioCredentials(ttlSeconds);
        provider = "twilio";
      } else if (turnProvider === "metered_api") {
        iceServers = await fetchMeteredApiCredentials();
        provider = "metered_api";
      } else if (turnProvider === "static") {
        console.warn("[get-turn-credentials] Static provider — STUN only, no TURN relay");
        iceServers = [...STUN_SERVERS];
        provider = "static";
      } else {
        iceServers = await buildHmacTurnCredentials(userId, ttlSeconds);
        provider = "hmac";
      }
    } catch (providerErr) {
      console.error("[get-turn-credentials] Provider error, using STUN fallback:", providerErr);
      iceServers = [...STUN_SERVERS];
      provider = "stun_fallback";
    }

    const turnAvailable = hasTurnServers(iceServers);

    if (isGuest && !turnAvailable) {
      console.warn(
        `[get-turn-credentials] Guest caller received STUN-only (provider=${provider}). ` +
        "Guests on restricted networks will be unable to connect. " +
        "Set TURN_PROVIDER to 'twilio' or 'metered_api' for ephemeral TURN credentials."
      );
    }

    if (isGuest && turnAvailable) {
      console.info(
        `[get-turn-credentials] Guest caller issued ephemeral TURN credentials (provider=${provider}, ttl=${ttlSeconds}s)`
      );
    }

    const cacheMaxAge = Math.min(ttlSeconds, 300);
    return new Response(
      JSON.stringify({
        iceServers,
        ttlSeconds,
        provider,
        guest: isGuest,
        turnAvailable,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": `private, no-store, max-age=${cacheMaxAge}`,
        },
      }
    );
  } catch (err) {
    console.error("[get-turn-credentials] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function buildHmacTurnCredentials(
  userId: string,
  ttlSeconds: number
): Promise<Array<Record<string, unknown>>> {
  const sharedSecret = Deno.env.get("TURN_SHARED_SECRET") || "";
  const turnDomain = Deno.env.get("TURN_DOMAIN") || "a.relay.metered.ca";

  if (!sharedSecret) {
    console.warn("[get-turn-credentials] TURN_SHARED_SECRET not set, returning STUN only");
    return [...STUN_SERVERS];
  }

  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:${userId}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sharedSecret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(username));
  const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));

  const turnUrls = [
    `turn:${turnDomain}:80`,
    `turn:${turnDomain}:80?transport=tcp`,
    `turn:${turnDomain}:443`,
    `turns:${turnDomain}:443?transport=tcp`,
  ];

  return [
    ...STUN_SERVERS,
    ...turnUrls.map((urls) => ({ urls, username, credential })),
  ];
}

async function fetchTwilioCredentials(ttlSeconds: number): Promise<Array<Record<string, unknown>>> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  if (!accountSid || !authToken) throw new Error("Twilio credentials not configured");

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `Ttl=${ttlSeconds}`,
    }
  );

  if (!resp.ok) throw new Error(`Twilio error: ${resp.status}`);
  const data = await resp.json();

  return (data.ice_servers || []).map((s: Record<string, unknown>) => ({
    urls: s.urls || s.url,
    username: s.username,
    credential: s.credential,
  }));
}

async function fetchMeteredApiCredentials(): Promise<Array<Record<string, unknown>>> {
  const apiKey = Deno.env.get("TURN_API_KEY") || "";
  const domain = Deno.env.get("TURN_DOMAIN") || "easylocs.metered.live";
  if (!apiKey) throw new Error("Metered API key not configured");

  const resp = await fetch(
    `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`
  );
  if (!resp.ok) throw new Error(`Metered error: ${resp.status}`);

  const servers = await resp.json();
  return servers.map((s: Record<string, unknown>) => ({
    urls: s.urls,
    username: s.username,
    credential: s.credential,
  }));
}
