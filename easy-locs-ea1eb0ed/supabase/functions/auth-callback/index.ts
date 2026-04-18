import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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

  try {
    if (req.method === "GET") {
      return jsonResponse({
        ok: true,
        function: "auth-callback",
        note:
          "OAuth callbacks for Google/Apple are handled client-side by /auth/callback (AuthCallbackPage). This endpoint exists as a server-side fallback for code exchange.",
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    let payload: { code?: string; code_verifier?: string; probe?: boolean } = {};
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }

    if (payload.probe) {
      return jsonResponse({ ok: true, ready: true });
    }

    const code = payload.code;
    if (!code || typeof code !== "string") {
      return jsonResponse({ error: "code_required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return jsonResponse({ error: "supabase_not_configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, anonKey);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return jsonResponse(
        { error: "exchange_failed", message: error.message },
        400,
      );
    }

    return jsonResponse({
      ok: true,
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      hasSession: !!data.session,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[auth-callback] error:", message);
    return jsonResponse({ error: "internal_error", message }, 500);
  }
});
