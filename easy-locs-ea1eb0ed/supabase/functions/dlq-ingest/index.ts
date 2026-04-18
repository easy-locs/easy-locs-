import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ALLOWED_SOURCE_SYSTEMS = [
  "orbit-message",
  "orbit-payment",
  "orbit-dispatch",
  "booking",
  "wallet",
  "listing",
];

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const rlResult = await checkServerRateLimit(req, "dlq-ingest", { maxRequests: 10, windowSeconds: 60 });
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const token = authHeader.replace("Bearer ", "");

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authErr } = await userClient.auth.getUser(token);
  if (authErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
    });
  }

  try {
    const body = await req.json();
    const { source_system, operation_type, payload, error } = body;

    if (!source_system || !operation_type || !error) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    if (!ALLOWED_SOURCE_SYSTEMS.includes(source_system)) {
      return new Response(JSON.stringify({ error: "Invalid source_system" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const safePayload = typeof payload === "object" && payload !== null
      ? { ...payload, _submitted_by: userData.user.id }
      : { _raw: String(payload ?? ""), _submitted_by: userData.user.id };

    const { error: dlqErr } = await admin.rpc("insert_into_dlq", {
      p_source_system: source_system,
      p_operation_type: operation_type,
      p_payload: safePayload,
      p_error: String(error).slice(0, 2000),
    });

    if (dlqErr) throw dlqErr;

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[dlq-ingest] Failed:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
