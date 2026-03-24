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

async function aggregateBoostAnalytics(supabase: any): Promise<ModuleCheck> {
  const t = Date.now();
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    const { data: campaigns, error: campErr } = await supabase
      .from("boost_campaigns")
      .select("id")
      .eq("status", "active");
    
    if (campErr || !campaigns?.length) {
      return { module: "boost_analytics_daily", group: "analytics", status: "ok", detail: `No active campaigns to aggregate`, durationMs: Date.now() - t };
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
        campaign_id: camp.id,
        day: today,
        impressions,
        clicks,
        leads,
        ctr: Math.round(ctr * 10000) / 10000,
        cpl: leads > 0 ? 0 : null,
        spend: 0,
        roi_proxy: 0,
      }, { onConflict: "campaign_id,day" });
      
      aggregated++;
    }

    return { module: "boost_analytics_daily", group: "analytics", status: "ok", detail: `Aggregated ${aggregated} campaigns for ${today}`, durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: "boost_analytics_daily", group: "analytics", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
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

  const tables = [
    ["db.storefront_pages", "storefront_pages"],
    ["db.wallet_accounts", "wallet_accounts"],
    ["db.conversations_v2", "conversations_v2"],
    ["db.boost_campaigns", "boost_campaigns"],
    ["db.orders", "orders"],
    ["db.orbit_profiles_v2", "orbit_profiles_v2"],
    ["db.boost_slots", "boost_slots"],
    ["db.boost_leads", "boost_leads"],
  ];

  const tableChecks = await Promise.all(
    tables.map(([name, table]) => checkTable(supabase, name, table))
  );
  results.push(...tableChecks);

  if (jobType === "full" || jobType === "analytics") {
    const analyticsResult = await aggregateBoostAnalytics(supabase);
    results.push(analyticsResult);
  }

  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === "ok").length,
    error: results.filter(r => r.status === "error").length,
    fixed: results.filter(r => r.status === "fixed").length,
  };

  const runRecord = {
    trigger_type: jobType === "full" ? "cron_full" : `cron_${jobType}`,
    started_at: new Date(start).toISOString(),
    completed_at: new Date().toISOString(),
    total_ms: Date.now() - start,
    summary_json: summary,
    modules_json: results,
    auto_fixes_count: summary.fixed,
    errors_count: summary.error,
    status: summary.error > 0 ? "degraded" : "healthy",
  };

  await supabase.from("platform_recovery_runs").insert(runRecord);

  const { data: oldRuns } = await supabase
    .from("platform_recovery_runs")
    .select("id")
    .order("started_at", { ascending: true })
    .range(0, Math.max(0, 999));
  
  if (oldRuns && oldRuns.length > 200) {
    const toDelete = oldRuns.slice(0, oldRuns.length - 200).map((r: any) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("platform_recovery_runs").delete().in("id", toDelete);
    }
  }

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
