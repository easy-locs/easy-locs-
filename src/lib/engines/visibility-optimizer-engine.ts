/**
 * Visibility Optimizer Engine — Re-evaluates published shops and adjusts visibility.
 * Promotes high-quality, demotes degraded quality.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

interface VisibilityOptimizerResult {
  scanned: number;
  promoted: number;
  downgraded: number;
  unchanged: number;
}

export async function runVisibilityOptimizer(limit = 100): Promise<VisibilityOptimizerResult> {
  const result: VisibilityOptimizerResult = { scanned: 0, promoted: 0, downgraded: 0, unchanged: 0 };

  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, visibility_mode, visibility_score, cover_image, category, subcategory, menu_items_json, hotel_inventory_json, menu_quality_flag, vertical, manual_lock, owner_controlled, needs_rescrape")
    .in("visibility_mode", ["search_only", "live"])
    .limit(limit);

  if (!merchants?.length) return result;
  result.scanned = merchants.length;

  for (const m of merchants) {
    if (m.manual_lock === true || m.owner_controlled === true) { result.unchanged++; continue; }

    const score = m.visibility_score ?? 0;
    const current = m.visibility_mode;
    let newMode = current;

    // Downgrade conditions
    if (!m.cover_image || !m.category) {
      newMode = "hidden";
    } else if (m.menu_quality_flag === "empty_after_cleanup" || m.menu_quality_flag === "high_duplication") {
      newMode = "hidden";
    } else if (score < 30) {
      newMode = "hidden";
    } else if (score < 50 && current === "live") {
      newMode = "search_only";
    } else if (m.needs_rescrape === true && score < 60) {
      newMode = "search_only";
    }

    // Promote conditions
    if (score >= 70 && current === "search_only" && m.cover_image && m.category) {
      newMode = "live";
    }

    if (newMode === current) { result.unchanged++; continue; }

    const now = new Date().toISOString();
    await db.from("seed_merchants").update({
      visibility_mode: newMode,
      last_publish_check_at: now,
      visibility_decision_reason: `optimizer: score=${score}, ${current}->${newMode}`,
      ...(newMode === "hidden" ? { unpublished_at: now, unpublish_reason: `quality_degraded: score=${score}` } : {}),
    }).eq("id", m.id);

    if (newMode === "live" && current === "search_only") result.promoted++;
    else result.downgraded++;
  }

  console.log(`[visibility-optimizer] scanned=${result.scanned} promoted=${result.promoted} downgraded=${result.downgraded}`);
  return result;
}
