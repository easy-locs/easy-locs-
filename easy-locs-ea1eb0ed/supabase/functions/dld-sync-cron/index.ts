/**
 * dld-sync-cron — Scheduled Edge Function for automatic DLD data synchronization.
 * Keeps the analytics.dld_transactions table updated with fresh data from the
 * Dubai Land Department API on a recurring basis.
 *
 * Schedule via pg_cron (daily at 03:00 UTC):
 *   SELECT cron.schedule('dld-sync-daily', '0 3 * * *',
 *     $$SELECT net.http_post(
 *       url := '<SUPABASE_URL>/functions/v1/dld-sync-cron',
 *       headers := jsonb_build_object(
 *         'Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>',
 *         'Content-Type', 'application/json'
 *       ),
 *       body := '{}'::jsonb
 *     )$$
 *   );
 *
 * Optional: add an hourly lightweight sync:
 *   SELECT cron.schedule('dld-sync-hourly', '15 * * * *',
 *     $$SELECT net.http_post(
 *       url := '<SUPABASE_URL>/functions/v1/dld-sync-cron',
 *       headers := jsonb_build_object(
 *         'Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>',
 *         'Content-Type', 'application/json'
 *       ),
 *       body := '{"mode":"recent"}'::jsonb
 *     )$$
 *   );
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { isDLDApiConfigured } from "../_shared/dld-api-client.ts";
import { syncDLDData } from "../_shared/dld-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    await supabase
      .schema("analytics")
      .from("dld_sync_log")
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
