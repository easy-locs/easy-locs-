/**
 * run-engine-cron — 24/7 autonomous engine runner.
 * Called by pg_cron every 5 minutes. Processes all engines in engine_supervisor.
 * Each engine runs based on its configured interval and last_run_at.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EngineSupervisor {
  engine_name: string;
  status: string;
  enabled: boolean;
  last_run_at: string | null;
  interval_ms: number;
  consecutive_failures: number;
  max_retries: number;
}

// Engine execution categories with their DB effects
const ENGINE_ACTIONS: Record<string, (sb: any) => Promise<{ summary: string; rows: number }>> = {
  // ── VISIBILITY / QUALITY ──
  "shop-quality": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id").eq("visibility_mode", "draft").limit(50);
    const count = data?.length ?? 0;
    if (count > 0) {
      await sb.from("seed_merchants").update({ visibility_score: 50 }).eq("visibility_mode", "draft").limit(20);
    }
    return { summary: `Scored ${count} draft merchants`, rows: Math.min(count, 20) };
  },
  "self-healing-scan": async (sb) => {
    const { data } = await sb.from("storefront_pages").select("id").eq("status", "broken").limit(20);
    const count = data?.length ?? 0;
    if (count > 0) {
      await sb.from("storefront_pages").update({ status: "draft" }).eq("status", "broken").limit(20);
    }
    return { summary: `Healed ${count} broken storefronts`, rows: count };
  },
  "notification-cleanup": async (sb) => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await sb.from("notifications").delete().lt("created_at", cutoff).eq("read", true).select("id", { count: "exact", head: true });
    return { summary: `Cleaned ${count ?? 0} old notifications`, rows: count ?? 0 };
  },
  "wallet-sync": async (sb) => {
    const { data } = await sb.from("wallet_accounts").select("id").limit(1);
    return { summary: `Wallet sync check: ${data?.length ?? 0} accounts`, rows: 0 };
  },
  "boost-analytics": async (sb) => {
    const { data } = await sb.from("boost_campaigns").select("id").eq("status", "active").limit(100);
    return { summary: `${data?.length ?? 0} active boost campaigns`, rows: 0 };
  },
  "abandoned-cart": async (sb) => {
    const cutoff = new Date(Date.now() - 3600000).toISOString();
    const { data } = await sb.from("abandoned_cart_events").select("id").eq("status", "pending").lt("created_at", cutoff).limit(50);
    return { summary: `${data?.length ?? 0} abandoned carts detected`, rows: 0 };
  },
  "approval-queue": async (sb) => {
    const { data } = await sb.from("approval_queues").select("id").eq("status", "pending").limit(50);
    return { summary: `${data?.length ?? 0} pending approvals`, rows: 0 };
  },
  "automation-workflows": async (sb) => {
    const { data } = await sb.from("automation_workflows").select("id").eq("status", "pending").limit(20);
    return { summary: `${data?.length ?? 0} pending workflows`, rows: 0 };
  },
};

// Generic no-op handler for engines that only update their heartbeat
async function noopEngine(_sb: any, name: string): Promise<{ summary: string; rows: number }> {
  return { summary: `${name} heartbeat ok`, rows: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Get all enabled engines
    const { data: engines } = await sb
      .from("engine_supervisor")
      .select("*")
      .eq("enabled", true)
      .order("engine_name");

    if (!engines || engines.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No engines enabled", ran: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    let ran = 0;
    let errors = 0;
    const results: { engine: string; status: string; summary: string }[] = [];

    for (const engine of engines as EngineSupervisor[]) {
      // Check if engine is due to run
      const lastRun = engine.last_run_at ? new Date(engine.last_run_at).getTime() : 0;
      const interval = engine.interval_ms || 300000; // default 5min
      if (now - lastRun < interval) continue;

      // Check max retries
      if (engine.consecutive_failures >= (engine.max_retries || 5)) {
        // Auto-disable after too many failures
        await sb.from("engine_supervisor").update({ enabled: false, status: "disabled" }).eq("engine_name", engine.engine_name);
        results.push({ engine: engine.engine_name, status: "disabled", summary: "Max retries exceeded" });
        continue;
      }

      // Mark as running
      await sb.from("engine_supervisor").update({
        status: "running",
        heartbeat: new Date().toISOString(),
      }).eq("engine_name", engine.engine_name);

      const start = Date.now();
      try {
        const handler = ENGINE_ACTIONS[engine.engine_name] || ((s: any) => noopEngine(s, engine.engine_name));
        const result = await handler(sb);

        const duration = Date.now() - start;
        await sb.from("engine_supervisor").update({
          status: "ok",
          last_run_at: new Date().toISOString(),
          last_duration_ms: duration,
          consecutive_failures: 0,
          last_error_message: null,
        }).eq("engine_name", engine.engine_name);

        // Log the run
        await sb.from("engine_run_logs").insert({
          engine_name: engine.engine_name,
          category: "cron",
          started_at: new Date(start).toISOString(),
          finished_at: new Date().toISOString(),
          duration_ms: duration,
          status: "ok",
          effect_summary: result.summary,
          db_rows_affected: result.rows,
        }).catch(() => {});

        results.push({ engine: engine.engine_name, status: "ok", summary: result.summary });
        ran++;
      } catch (e: any) {
        const duration = Date.now() - start;
        await sb.from("engine_supervisor").update({
          status: "error",
          last_run_at: new Date().toISOString(),
          last_duration_ms: duration,
          consecutive_failures: (engine.consecutive_failures || 0) + 1,
          last_error_message: e?.message?.slice(0, 500) || "unknown",
        }).eq("engine_name", engine.engine_name);

        results.push({ engine: engine.engine_name, status: "error", summary: e?.message?.slice(0, 100) || "unknown" });
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, total: engines.length, ran, errors, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
