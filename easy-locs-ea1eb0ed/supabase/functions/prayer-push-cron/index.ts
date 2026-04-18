import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
import {
  processPrayerCron,
} from "../_shared/prayer-cron-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(withEdgeLogging("prayer-push-cron", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("check") === "health") {
      const { count } = await supabase
        .from("prayer_push_schedules")
        .select("id", { count: "exact", head: true });

      const { data: recentRuns } = await supabase
        .from("engine_supervisor")
        .select("last_run_at, last_success_at, status")
        .eq("engine_name", "prayer-push-cron")
        .maybeSingle();

      return new Response(
        JSON.stringify({
          status: "ok",
          schedule_count: count ?? 0,
          last_run: recentRuns?.last_run_at ?? null,
          last_success: recentRuns?.last_success_at ?? null,
          engine_status: recentRuns?.status ?? "unknown",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    logger.info("prayer_push_cron_started", {});

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: expiredRows, error: cleanupErr } = await cFromEdge(supabase, "prayer_push_schedules")
      .delete()
      .lt("schedule_date", cutoffDate)
      .select("id");

    const cleanedCount = expiredRows?.length ?? 0;

    if (cleanupErr) {
      logger.error("prayer_push_cleanup_error", { error: cleanupErr.message });
    } else {
      logger.info("prayer_push_cleanup_done", { cutoff_date: cutoffDate, cleaned: cleanedCount });
    }

    await cRpcEdge(supabase, "update_autonomy_status", {
      p_system_name: "prayer_schedule_cleanup",
      p_status: cleanupErr ? "yellow" : "green",
      p_error_message: cleanupErr ? cleanupErr.message : null,
    }).catch(() => {});

    const result = await processPrayerCron(supabase, logger);

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
        retried: result.retried,
        cleanup: { cutoff_date: cutoffDate, cleaned: cleanedCount },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("prayer_push_cron_error", { error: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
}));
