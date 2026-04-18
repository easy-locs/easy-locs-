// LB Closeout #852 — session-authenticated AI parse endpoint for the
// in-app Command Control composer. The webhook intake function
// (`command-email-intake`) is HMAC-gated for inbound mail providers and
// rejects browser callers, so this thin sibling exists to give signed-in
// users the same governed AI parse path via Supabase JWT auth. It reuses
// the canonical `parseEmailWithAI` helper (which routes through
// `dispatchAiCompletion`) so quota / sensitive routing / audit are
// uniformly enforced.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { withRateLimit } from "../_shared/with-rate-limit.ts";
import { parseEmailWithAI } from "../command-email-intake/parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface ParseRequest {
  subject?: string;
  body?: string;
}

async function handler(req: Request): Promise<Response> {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Session-gated: require a valid Supabase user JWT. The browser's
  // supabase.functions.invoke() automatically forwards the user token in
  // the Authorization header.
  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  let body: ParseRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subject = (body.subject ?? "").toString().slice(0, 500);
  const text = (body.body ?? "").toString().slice(0, 20_000);
  if (!subject && !text) {
    return new Response(JSON.stringify({ error: "Missing subject and body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = await parseEmailWithAI(subject, text);
    return new Response(JSON.stringify({ parsed, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[command-email-parse] failure:", err);
    return new Response(JSON.stringify({ error: "Parse failed" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(withRateLimit("command-email-parse", handler));
