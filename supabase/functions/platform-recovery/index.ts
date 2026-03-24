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
    const notFound = error?.message?.includes("Could not find the function") && !error?.message?.includes("without parameters");
    const reachable = !error || !notFound;
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
      return { module: "boost_analytics_daily", group: "analytics", status: "ok", detail: "No active campaigns", durationMs: Date.now() - t };
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
      detail: `storefronts:${counts[0]} seeds:${counts[1]} profiles:${counts[2]} wallets:${counts[3]}`,
      durationMs: Date.now() - t,
    };
  } catch (e: any) {
    return { module: "master_audit", group: "audit", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function cleanupStaleData(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
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

// ── Server-side auto-fixes ──────────────────────────────────

async function runServerAutoFixes(supabase: any): Promise<ModuleCheck[]> {
  const results: ModuleCheck[] = [];
  const t = Date.now();

  // Fix: expired boost campaigns still marked active
  try {
    const now = new Date().toISOString();
    const { data: expired } = await supabase
      .from("boost_campaigns")
      .select("id")
      .eq("status", "active")
      .lt("end_at", now);
    
    if (expired && expired.length > 0) {
      await supabase.from("boost_campaigns")
        .update({ status: "completed" })
        .in("id", expired.map((c: any) => c.id));
      results.push({ module: "autofix.expired_campaigns", group: "autofix", status: "fixed", detail: `Completed ${expired.length} expired campaigns`, durationMs: Date.now() - t });
    } else {
      results.push({ module: "autofix.expired_campaigns", group: "autofix", status: "ok", detail: "No expired campaigns", durationMs: Date.now() - t });
    }
  } catch (e: any) {
    results.push({ module: "autofix.expired_campaigns", group: "autofix", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t });
  }

  // Fix: stale new leads older than 7 days → mark as cold
  try {
    const t2 = Date.now();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleLeads } = await supabase
      .from("boost_leads")
      .select("id")
      .eq("status", "new")
      .lt("created_at", weekAgo);
    
    if (staleLeads && staleLeads.length > 0) {
      await supabase.from("boost_leads")
        .update({ status: "cold" })
        .in("id", staleLeads.map((l: any) => l.id));
      results.push({ module: "autofix.stale_leads", group: "autofix", status: "fixed", detail: `Marked ${staleLeads.length} stale leads as cold`, durationMs: Date.now() - t2 });
    } else {
      results.push({ module: "autofix.stale_leads", group: "autofix", status: "ok", detail: "No stale leads", durationMs: Date.now() - t2 });
    }
  } catch (e: any) {
    results.push({ module: "autofix.stale_leads", group: "autofix", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t });
  }

  return results;
}

// ── Geo health server-side (check geo defaults table) ───────

async function checkGeoDefaults(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    const { count, error } = await supabase
      .from("storefront_pages").select("id", { count: "exact", head: true })
      .is("latitude", null);
    
    return {
      module: "geo_coverage",
      group: "health",
      status: error ? "error" : "ok",
      detail: error ? error.message : `${count ?? 0} storefronts missing coordinates`,
      durationMs: Date.now() - t,
    };
  } catch (e: any) {
    return { module: "geo_coverage", group: "health", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

// ── Wallet pipeline health ──────────────────────────────────

async function checkWalletPipeline(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    const { count, error } = await supabase
      .from("wallet_accounts").select("id", { count: "exact", head: true })
      .eq("status", "active");
    
    return {
      module: "wallet_pipeline",
      group: "health",
      status: error ? "error" : "ok",
      detail: error ? error.message : `${count ?? 0} active wallets`,
      durationMs: Date.now() - t,
    };
  } catch (e: any) {
    return { module: "wallet_pipeline", group: "health", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
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
    ["db.notifications", "notifications"],
    ["db.support_tickets", "support_tickets"],
    ["db.loyalty_accounts", "loyalty_accounts"],
  ];
  const tableChecks = await Promise.all(tables.map(([n, t]) => checkTable(supabase, n, t)));
  results.push(...tableChecks);

  // ── RPC checks ──
  results.push(await checkRpc(supabase, "rpc.ensure_wallet_account", "ensure_wallet_account"));

  // ── Health pipeline checks ──
  results.push(await checkGeoDefaults(supabase));
  results.push(await checkWalletPipeline(supabase));

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

  // ── Server-side auto-fixes (full or autofix job) ──
  if (jobType === "full" || jobType === "autofix") {
    const fixes = await runServerAutoFixes(supabase);
    results.push(...fixes);
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
