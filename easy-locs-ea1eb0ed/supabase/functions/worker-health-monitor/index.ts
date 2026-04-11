import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STALE_THRESHOLD_MS = 600_000;
const STUCK_THRESHOLD_MS = 120_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: engines } = await supabase
      .from("engine_supervisor")
      .select("*")
      .order("engine_name");

    if (!engines?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: "No engines registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = Date.now();
    const staleEngines: string[] = [];
    const errorEngines: string[] = [];
    const stuckEngines: string[] = [];
    let healthy = 0;
    let disabled = 0;
    let totalSuccessRate = 0;

    for (const engine of engines) {
      if (!engine.enabled) {
        disabled++;
        continue;
      }

      if (engine.status === "running") {
        const heartbeatAge = engine.heartbeat
          ? now - new Date(engine.heartbeat).getTime()
          : Infinity;
        if (heartbeatAge > STUCK_THRESHOLD_MS) {
          stuckEngines.push(engine.engine_name);
          await supabase
            .from("engine_supervisor")
            .update({
              status: "idle",
              last_error_message: `Auto-unstuck after ${Math.round(heartbeatAge / 1000)}s`,
            })
            .eq("engine_name", engine.engine_name);
        }
        continue;
      }

      if (engine.status === "error") {
        errorEngines.push(engine.engine_name);
        continue;
      }

      const lastRun = engine.last_run_at
        ? now - new Date(engine.last_run_at).getTime()
        : Infinity;
      const expectedInterval = (engine.frequency_seconds || 300) * 1000;

      if (lastRun > expectedInterval * 3) {
        staleEngines.push(engine.engine_name);
      } else {
        healthy++;
      }

      totalSuccessRate += engine.success_rate || 0;
    }

    const enabledCount = engines.length - disabled;
    const avgSuccessRate = enabledCount > 0
      ? Math.round(totalSuccessRate / enabledCount * 100) / 100
      : 0;

    const oneHourAgo = new Date(now - 3600000).toISOString();
    const { count: runsLastHour } = await supabase
      .from("engine_run_logs")
      .select("id", { count: "exact", head: true })
      .gte("started_at", oneHourAgo);

    await supabase.from("worker_health_snapshots").insert({
      total_engines: engines.length,
      healthy_count: healthy,
      stale_count: staleEngines.length,
      error_count: errorEngines.length,
      disabled_count: disabled,
      stale_engines: staleEngines,
      error_engines: errorEngines,
      avg_success_rate: avgSuccessRate,
      total_runs_last_hour: runsLastHour ?? 0,
      metadata_json: {
        stuck_recovered: stuckEngines,
        timestamp: new Date().toISOString(),
      },
    });

    await supabase.from("engine_supervisor").update({
      last_run_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      status: "ok",
    }).eq("engine_name", "health-monitor");

    const summary = {
      ok: true,
      total: engines.length,
      enabled: enabledCount,
      healthy,
      stale: staleEngines.length,
      errors: errorEngines.length,
      disabled,
      stuck_recovered: stuckEngines.length,
      avg_success_rate: avgSuccessRate,
      runs_last_hour: runsLastHour ?? 0,
      stale_engines: staleEngines,
      error_engines: errorEngines,
      stuck_engines: stuckEngines,
    };

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[worker-health-monitor] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
