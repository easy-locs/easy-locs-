import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardFoodMerchantWrite } from "../_shared/food-firewall-adapter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKED_CATS = ["general", "other", "unknown", "null", "undefined", ""];
const PLACEHOLDER_PATTERNS = ["via.placeholder", "placehold.co", "dummyimage", "images.unsplash.com", "unsplash.com"];
const THRESHOLDS = { min_coming_soon: 35, min_search_only: 50, min_live: 70, min_menu: 3, min_name: 2 };

function isPlaceholder(url: string | null): boolean {
  if (!url) return true;
  return PLACEHOLDER_PATTERNS.some(p => url.toLowerCase().includes(p));
}
function validCoords(lat: any, lng: any): boolean {
  const la = Number(lat), lo = Number(lng);
  return !isNaN(la) && !isNaN(lo) && la >= 24.5 && la <= 25.6 && lo >= 54.8 && lo <= 56.0;
}

function computeScore(m: any): { overall: number; identity: number; location: number; visual: number; menu: number; source: number; failures: string[]; content_status: string } {
  let identity = 0, location = 0, visual = 0, menu = 0, source = 0;
  const failures: string[] = [];

  // Identity /20
  if (m.name?.length >= THRESHOLDS.min_name) identity += 5;
  else failures.push("missing_name");
  if (m.slug) identity += 3;
  if (m.source_entity_id) identity += 4;
  if (m.category && !BLOCKED_CATS.includes(m.category.toLowerCase())) identity += 4;
  else failures.push("invalid_category");
  if (m.subcategory && m.subcategory !== "casual_dining") identity += 4;
  identity = Math.min(identity, 20);

  // Location /20
  if (m.address) location += 6; else failures.push("missing_address");
  if (validCoords(m.latitude, m.longitude)) location += 8; else failures.push("missing_coordinates");
  if (m.city?.toLowerCase() === "dubai") location += 3;
  if (m.country) location += 3;
  location = Math.min(location, 20);

  // Visual /20
  if (!isPlaceholder(m.logo_image)) visual += 7; else failures.push("invalid_logo");
  if (!isPlaceholder(m.cover_image)) visual += 8; else failures.push("invalid_cover");
  visual += 5; // no duplicate check at this stage (already cleaned)
  visual = Math.min(visual, 20);

  // Menu /30
  const items = Array.isArray(m.menu_items_json) ? m.menu_items_json : [];
  const cats = Array.isArray(m.menu_categories_json) ? m.menu_categories_json : [];
  if (cats.length >= 1) menu += 5;
  if (cats.length >= 3) menu += 5;
  if (items.length >= THRESHOLDS.min_menu) menu += 8; else failures.push("insufficient_menu_items");
  if (items.length >= 10) menu += 5;
  if (items.some((i: any) => i.price > 0)) menu += 7;
  menu = Math.min(menu, 30);

  // Source /10
  if (m.source_type === "deliveroo") source += 6;
  if (m.source_last_scraped_at) {
    const age = Date.now() - new Date(m.source_last_scraped_at).getTime();
    if (age < 86400000) source += 4; else if (age < 3 * 86400000) source += 2;
  }
  source = Math.min(source, 10);

  const overall = identity + location + visual + menu + source;
  let content_status = "empty";
  if (overall >= 70 && failures.length === 0) content_status = "premium_ready";
  else if (overall >= 50) content_status = "ready";
  else if (overall >= 25) content_status = "partial";

  return { overall, identity, location, visual, menu, source, failures, content_status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  let rowsRead = 0, rowsAffected = 0, blocked = 0;
  const stats = { live: 0, search_only: 0, coming_soon: 0, hidden: 0 };

  try {
    const { data: merchants } = await supabase
      .from("seed_merchants")
      .select("*")
      .eq("source_type", "deliveroo")
      .eq("city", "dubai")
      .eq("pipeline_stage", "visual_clean")
      .limit(200);

    if (!merchants?.length) {
      return new Response(JSON.stringify({ success: true, message: "Nothing to gate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of merchants) {
      rowsRead++;
      const score = computeScore(m);
      const hasIdentity = m.name?.length >= THRESHOLDS.min_name && !BLOCKED_CATS.includes((m.category || "").toLowerCase());
      const hasLocation = !!m.address && validCoords(m.latitude, m.longitude);
      const hasSource = m.source_type === "deliveroo";

      // Decide visibility
      let visMode = "hidden", isPub = false, isCS = false, gateStatus = "failed", reason = "";

      if (score.overall < THRESHOLDS.min_coming_soon || !hasSource) {
        visMode = "hidden"; reason = `score=${score.overall}<${THRESHOLDS.min_coming_soon}`;
      } else if (hasIdentity && hasLocation && (score.menu < 20 || score.visual < 10)) {
        visMode = "coming_soon"; isPub = true; isCS = true; gateStatus = "passed";
        reason = `identity+location ok, menu=${score.menu}, visual=${score.visual}`;
      } else if (score.overall >= THRESHOLDS.min_live && score.failures.length === 0) {
        visMode = "live"; isPub = true; gateStatus = "passed";
        reason = `score=${score.overall}, no failures`;
      } else if (score.overall >= THRESHOLDS.min_search_only) {
        visMode = "search_only"; isPub = true; gateStatus = "passed";
        reason = `score=${score.overall} → search_only`;
      } else {
        visMode = "coming_soon"; isPub = true; isCS = true; gateStatus = score.failures.length ? "failed" : "passed";
        reason = `score=${score.overall}, failures=${score.failures.length}`;
      }

      stats[visMode as keyof typeof stats]++;

      const fields: Record<string, any> = {
        overall_quality_score: score.overall,
        visibility_score: score.overall,
        visibility_mode: visMode,
        publish_gate_status: gateStatus,
        blocking_reason: score.failures.length ? score.failures.join(", ") : null,
        gate_failures: score.failures,
        visibility_decision_reason: reason,
        is_published: isPub,
        is_coming_soon: isCS,
        content_status: score.content_status,
        quality_scored_at: new Date().toISOString(),
        pipeline_stage: "gated",
        pipeline_last_run_at: new Date().toISOString(),
      };

      const result = await guardFoodMerchantWrite(supabase, "food-visibility-gate-engine", m.id, fields, m);
      if (result.blocked) { blocked++; stats[visMode as keyof typeof stats]--; }
      else rowsAffected++;
    }

    await supabase.from("engine_run_logs").insert({
      engine_name: "food-visibility-gate-engine", trigger_source: "edge-function", status: "ok",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, rows_read: rowsRead, db_rows_affected: rowsAffected,
      side_effect_count: blocked,
      effect_summary: `Gated ${rowsAffected}: live=${stats.live}, search_only=${stats.search_only}, coming_soon=${stats.coming_soon}, hidden=${stats.hidden}, blocked=${blocked}`,
    });

    return new Response(JSON.stringify({ success: true, ...stats, blocked, total: rowsAffected }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "food-visibility-gate-engine", trigger_source: "edge-function", status: "error",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
