import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModuleCheck {
  module: string;
  group: string;
  status: "ok" | "error" | "fixed" | "skipped";
  detail: string;
  durationMs: number;
}

async function checkTable(supabase: any, name: string, table: string): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    const { error } = await supabase.from(table).select("id").limit(1);
    return { module: name, group: "backend", status: error ? "error" : "ok", detail: error ? error.message : "reachable", durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: name, group: "backend", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function checkRpc(supabase: any, name: string, rpcName: string): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    const { error } = await supabase.rpc(rpcName, {});
    const reachable = !error || !error.message?.includes("Could not find the function");
    return { module: name, group: "backend", status: reachable ? "ok" : "error", detail: reachable ? "rpc reachable" : error?.message ?? "not found", durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: name, group: "backend", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function aggregateBoostAnalytics(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: campaigns, error: campErr } = await supabase
      .from("boost_campaigns").select("id").eq("status", "active");
    
    if (campErr || !campaigns?.length) {
      return { module: "boost_analytics_daily", group: "analytics", status: "ok", detail: `No active campaigns`, durationMs: Date.now() - t };
    }

    let aggregated = 0;
    for (const camp of campaigns) {
      const [impRes, clickRes, leadRes] = await Promise.all([
        supabase.from("boost_impressions").select("id", { count: "exact", head: true }).eq("campaign_id", camp.id).gte("rendered_at", `${today}T00:00:00Z`),
        supabase.from("boost_clicks").select("id", { count: "exact", head: true }).eq("campaign_id", camp.id).gte("clicked_at", `${today}T00:00:00Z`),
        supabase.from("boost_leads").select("id", { count: "exact", head: true }).eq("campaign_id", camp.id).gte("created_at", `${today}T00:00:00Z`),
      ]);

      const impressions = impRes.count ?? 0;
      const clicks = clickRes.count ?? 0;
      const leads = leadRes.count ?? 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;

      await supabase.from("boost_analytics_daily").upsert({
        campaign_id: camp.id, day: today, impressions, clicks, leads,
        ctr: Math.round(ctr * 10000) / 10000, cpl: leads > 0 ? 0 : null, spend: 0, roi_proxy: 0,
      }, { onConflict: "campaign_id,day" });
      aggregated++;
    }

    return { module: "boost_analytics_daily", group: "analytics", status: "ok", detail: `Aggregated ${aggregated} campaigns for ${today}`, durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: "boost_analytics_daily", group: "analytics", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function runLeadPipelineCheck(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    const { count, error } = await supabase
      .from("boost_leads").select("id", { count: "exact", head: true })
      .eq("status", "new").limit(1);
    return { module: "lead_pipeline", group: "analytics", status: error ? "error" : "ok", detail: error ? error.message : `${count ?? 0} new leads pending`, durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: "lead_pipeline", group: "analytics", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function runMasterAuditServer(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    // Quick audit: check critical tables exist and have data integrity
    const checks = await Promise.all([
      supabase.from("storefront_pages").select("id", { count: "exact", head: true }),
      supabase.from("seed_merchants").select("id", { count: "exact", head: true }),
      supabase.from("orbit_profiles_v2").select("id", { count: "exact", head: true }),
      supabase.from("wallet_accounts").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    
    const counts = checks.map(c => c.count ?? 0);
    const errors = checks.filter(c => c.error).length;
    
    return {
      module: "master_audit",
      group: "audit",
      status: errors > 0 ? "error" : "ok",
      detail: `storefronts:${counts[0]} seeds:${counts[1]} profiles:${counts[2]} wallets:${counts[3]} errors:${errors}`,
      durationMs: Date.now() - t,
    };
  } catch (e: any) {
    return { module: "master_audit", group: "audit", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function cleanupStaleData(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    // Cleanup old recovery runs (keep last 200)
    const { data: oldRuns } = await supabase
      .from("platform_recovery_runs").select("id")
      .order("started_at", { ascending: true });
    
    let cleaned = 0;
    if (oldRuns && oldRuns.length > 200) {
      const toDelete = oldRuns.slice(0, oldRuns.length - 200).map((r: any) => r.id);
      if (toDelete.length > 0) {
        await supabase.from("platform_recovery_runs").delete().in("id", toDelete);
        cleaned = toDelete.length;
      }
    }

    return { module: "stale_cleanup", group: "maintenance", status: "ok", detail: `Cleaned ${cleaned} old runs`, durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: "stale_cleanup", group: "maintenance", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let jobType = "full";
  try {
    const body = await req.json();
    jobType = body?.job ?? "full";
  } catch { }

  const results: ModuleCheck[] = [];

  // ── Backend health checks (all jobs) ──
  const tables = [
    ["db.storefront_pages", "storefront_pages"],
    ["db.seed_merchants", "seed_merchants"],
    ["db.wallet_accounts", "wallet_accounts"],
    ["db.conversations_v2", "conversations_v2"],
    ["db.chat_messages_v2", "chat_messages_v2"],
    ["db.boost_campaigns", "boost_campaigns"],
    ["db.boost_slots", "boost_slots"],
    ["db.boost_leads", "boost_leads"],
    ["db.orders", "orders"],
    ["db.orbit_profiles_v2", "orbit_profiles_v2"],
    ["db.driver_profiles", "driver_profiles"],
    ["db.dino_notifications", "dino_notifications"],
    ["db.support_tickets", "support_tickets"],
    ["db.loyalty_accounts", "loyalty_accounts"],
  ];
  const tableChecks = await Promise.all(tables.map(([n, t]) => checkTable(supabase, n, t)));
  results.push(...tableChecks);

  // ── RPC checks ──
  results.push(await checkRpc(supabase, "rpc.ensure_wallet_account", "ensure_wallet_account"));

  // ── Job-specific modules ──
  if (jobType === "full" || jobType === "analytics") {
    results.push(await aggregateBoostAnalytics(supabase));
    results.push(await runLeadPipelineCheck(supabase));
  }

  if (jobType === "full" || jobType === "audit") {
    results.push(await runMasterAuditServer(supabase));
  }

  if (jobType === "full" || jobType === "cleanup") {
    results.push(await cleanupStaleData(supabase));
  }

  // ── Summary ──
  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === "ok").length,
    error: results.filter(r => r.status === "error").length,
    fixed: results.filter(r => r.status === "fixed").length,
  };

  // ── Persist run ──
  await supabase.from("platform_recovery_runs").insert({
    trigger_type: `cron_${jobType}`,
    started_at: new Date(start).toISOString(),
    completed_at: new Date().toISOString(),
    total_ms: Date.now() - start,
    summary_json: summary,
    modules_json: results,
    auto_fixes_count: summary.fixed,
    errors_count: summary.error,
    status: summary.error > 0 ? "degraded" : "healthy",
  });

  return new Response(JSON.stringify({
    status: summary.error > 0 ? "degraded" : "healthy",
    job: jobType,
    summary,
    results,
    totalMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: summary.error > 0 ? 503 : 200,
  });
});
