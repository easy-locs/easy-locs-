import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const DEFAULT_RETENTION_DAYS = 90;

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  try {
    let retentionDays = DEFAULT_RETENTION_DAYS;
    try {
      const body = await req.json();
      if (typeof body?.retention_days === "number" && body.retention_days > 0) {
        retentionDays = Math.floor(body.retention_days);
      }
    } catch {
      /* no body — use default */
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: deleted, error } = await supabase
      .schema("analytics")
      .rpc("purge_integration_health_logs", {
        retention_days: retentionDays,
      });

    if (error) {
      console.error("[cleanup-integration-health-logs] RPC error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[cleanup-integration-health-logs] Purged ${deleted} rows older than ${retentionDays} days`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        deleted,
        retention_days: retentionDays,
        ran_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[cleanup-integration-health-logs] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
