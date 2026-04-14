import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "get-turn-credentials");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const turnProvider = Deno.env.get("TURN_PROVIDER") || "static";
    let iceServers: Array<Record<string, unknown>>;
    let provider = turnProvider;

    try {
      if (turnProvider === "twilio") {
        iceServers = await fetchTwilioCredentials();
        provider = "twilio";
      } else if (turnProvider === "metered_api") {
        iceServers = await fetchMeteredApiCredentials();
        provider = "metered_api";
      } else {
        iceServers = buildStaticIceServers();
        provider = "static";
      }
    } catch (providerErr) {
      console.error("[get-turn-credentials] Provider error, using static fallback:", providerErr);
      iceServers = buildStaticIceServers();
      provider = "fallback";
    }

    return new Response(
      JSON.stringify({ iceServers, ttl: 86400, provider }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300",
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

async function fetchTwilioCredentials(): Promise<Array<Record<string, unknown>>> {
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
      body: "Ttl=86400",
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

function buildStaticIceServers(): Array<Record<string, unknown>> {
  const turnUsername = Deno.env.get("TURN_USERNAME") || "";
  const turnCredential = Deno.env.get("TURN_CREDENTIAL") || "";

  const servers: Array<Record<string, unknown>> = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ];

  if (turnUsername && turnCredential) {
    servers.push(
      { urls: "turn:a.relay.metered.ca:80", username: turnUsername, credential: turnCredential },
      { urls: "turn:a.relay.metered.ca:80?transport=tcp", username: turnUsername, credential: turnCredential },
      { urls: "turn:a.relay.metered.ca:443", username: turnUsername, credential: turnCredential },
      { urls: "turns:a.relay.metered.ca:443?transport=tcp", username: turnUsername, credential: turnCredential }
    );
  }

  return servers;
}
