import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();

  try {
    // Total counts by visibility
    const { data: all } = await supabase
      .from("seed_merchants")
      .select("id, visibility_mode, publish_gate_status, overall_quality_score, content_status, gate_failures, logo_image, cover_image, menu_items_json")
      .eq("source_type", "deliveroo")
      .eq("city", "dubai")
      .limit(1000);

    if (!all?.length) {
      return new Response(JSON.stringify({ success: true, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const report = {
      total: all.length,
      hidden: 0, coming_soon: 0, search_only: 0, live: 0,
      no_menu: 0, placeholder_visual: 0, duplicate_cover: 0,
      avg_quality: 0,
      top_failures: {} as Record<string, number>,
    };

    const PLACEHOLDERS = ["via.placeholder", "placehold.co", "dummyimage", "unsplash.com"];
    let qualitySum = 0;

    for (const m of all) {
      // Visibility stats
      if (m.visibility_mode === "hidden") report.hidden++;
      else if (m.visibility_mode === "coming_soon") report.coming_soon++;
      else if (m.visibility_mode === "search_only") report.search_only++;
      else if (m.visibility_mode === "live") report.live++;

      qualitySum += m.overall_quality_score ?? 0;

      // Menu check
      const items = Array.isArray(m.menu_items_json) ? m.menu_items_json : [];
      if (items.length === 0) report.no_menu++;

      // Visual check
      const isPlaceholder = (url: string | null) => !url || PLACEHOLDERS.some(p => (url || "").toLowerCase().includes(p));
      if (isPlaceholder(m.logo_image) || isPlaceholder(m.cover_image)) report.placeholder_visual++;

      // Gate failures
      const failures = Array.isArray(m.gate_failures) ? m.gate_failures : [];
      for (const f of failures) {
        report.top_failures[f] = (report.top_failures[f] || 0) + 1;
      }
    }

    report.avg_quality = Math.round(qualitySum / all.length);

    // Sort top failures
    const sortedFailures = Object.entries(report.top_failures)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    await supabase.from("engine_run_logs").insert({
      engine_name: "food-audit-engine", trigger_source: "edge-function", status: "ok",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, rows_read: all.length,
      metadata_json: report,
      effect_summary: `Audit: ${all.length} total, live=${report.live}, coming_soon=${report.coming_soon}, hidden=${report.hidden}, avg_q=${report.avg_quality}`,
    });

    return new Response(JSON.stringify({
      success: true,
      ...report,
      top_failures: sortedFailures.map(([k, v]) => ({ failure: k, count: v })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "food-audit-engine", trigger_source: "edge-function", status: "error",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
