import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * dld-sync-cron — Scheduled Edge Function for automatic DLD data synchronization.
 * Keeps the analytics.dld_transactions table updated with fresh data from the
 * Dubai Land Department API on a monthly basis.
 *
 * Schedule via pg_cron (monthly on 1st at 03:00 UTC):
 *   SELECT cron.schedule('dld-sync-monthly', '0 3 1 * *',
 *     $$SELECT net.http_post(
 *       url := '<SUPABASE_URL>/functions/v1/dld-sync-cron',
 *       headers := jsonb_build_object(
 *         'Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>',
 *         'Content-Type', 'application/json'
 *       ),
 *       body := '{"mode":"full"}'::jsonb
 *     )$$
 *   );
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { isDLDApiConfigured } from "../_shared/dld-api-client.ts";
import { syncDLDData } from "../_shared/dld-sync.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cronSecret = Deno.env.get("DLD_SYNC_CRON_SECRET");

  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const isServiceRole = token.length > 0 && token === serviceRoleKey;
  const isCronSecret = cronSecret && cronSecret.length > 0 && token === cronSecret;

  if (!isServiceRole && !isCronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const startTime = Date.now();
  const startIso = new Date(startTime).toISOString();

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("check") === "health") {
      const { data: lastSync } = await supabase
        .schema("analytics")
        .from("dld_sync_log")
        .select("status, mode, affected, errors, started_at, completed_at, duration_ms")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: sv } = await supabase
        .from("engine_supervisor")
        .select("last_run_at, last_success_at, status")
        .eq("engine_name", "dld-data-sync")
        .maybeSingle();

      return new Response(
        JSON.stringify({
          status: "ok",
          last_sync: lastSync ?? null,
          engine: sv ?? null,
          api_configured: isDLDApiConfigured(),
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine — defaults apply
    }

    const mode = (body.mode as string) || "full";

    if (!isDLDApiConfigured()) {
      const result = {
        status: "skipped",
        reason: "DLD API not configured (DLD_API_KEY missing)",
        mode,
        startedAt: startIso,
        durationMs: Date.now() - startTime,
      };
      console.log("[dld-sync-cron]", JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fromDate: string | undefined;
    let toDate: string | undefined;

    if (mode === "recent") {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      fromDate = weekAgo.toISOString().slice(0, 10);
      toDate = now.toISOString().slice(0, 10);
    } else if (body.fromDate) {
      fromDate = body.fromDate as string;
      toDate = (body.toDate as string) || undefined;
    }

    const syncResult = await syncDLDData(supabase, {
      fromDate,
      toDate,
      fullSync: mode === "full",
    });

    const durationMs = Date.now() - startTime;

    const result = {
      status: syncResult.source === "cooldown" ? "skipped" : "completed",
      mode,
      affected: syncResult.affected,
      errors: syncResult.errors,
      source: syncResult.source,
      startedAt: startIso,
      completedAt: new Date().toISOString(),
      durationMs,
    };

    await logSyncRun(supabase, result);

    console.log("[dld-sync-cron]", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const durationMs = Date.now() - startTime;

    const result = {
      status: "error",
      error: message,
      startedAt: startIso,
      completedAt: new Date().toISOString(),
      durationMs,
    };

    await logSyncRun(supabase, result).catch(() => {});

    try {
      const alertResp = await fetch(`${supabaseUrl}/functions/v1/alert-dispatcher`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alert_type: "dld_sync_failure",
          severity: "high",
          title: "DLD Data Sync Failed",
          message: `DLD sync failed after ${durationMs}ms: ${message}`,
          source_system: "dld-sync-cron",
        }),
      });
      if (!alertResp.ok) {
        console.error(`[dld-sync-cron] Alert dispatch returned ${alertResp.status}`);
      }
    } catch (alertErr) {
      console.error("[dld-sync-cron] Alert dispatch failed:", alertErr);
    }

    console.error("[dld-sync-cron] Error:", message);
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logSyncRun(
  supabase: ReturnType<typeof createClient>,
  result: Record<string, unknown>,
): Promise<void> {
  try {
    await cFromEdge(supabase.schema("analytics"), "dld_sync_log")
      .insert({
        status: result.status,
        mode: result.mode || null,
        affected: result.affected || 0,
        errors: result.errors || 0,
        source: result.source || null,
        error_message: result.error || null,
        started_at: result.startedAt,
        completed_at: result.completedAt,
        duration_ms: result.durationMs,
      });
  } catch (err) {
    console.warn("[dld-sync-cron] Failed to log sync run:", (err as Error).message);
  }
}
