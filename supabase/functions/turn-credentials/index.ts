import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha1Base64(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData } = await userClient.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error("Not authenticated");

    const turnSecret = Deno.env.get("TURN_SECRET");
    const turnHost = Deno.env.get("TURN_HOST");
    if (!turnSecret || !turnHost) throw new Error("TURN env missing");

    const ttlSeconds = 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

    // Coturn auth-secret username format: "<expiry>:<userid>"
    const username = `${expiresAt}:${user.id}`;
    const credential = await hmacSha1Base64(turnSecret, username);

    const payload = {
      username,
      credential,
      ttlSeconds,
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        {
          urls: [
            `turn:${turnHost}:3478?transport=udp`,
            `turn:${turnHost}:3478?transport=tcp`,
            `turns:${turnHost}:5349?transport=tcp`,
          ],
          username,
          credential,
        },
      ],
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
