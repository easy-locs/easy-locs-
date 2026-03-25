/**
 * Auto-Unpublish Engine — Removes shops that no longer meet quality standards.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

interface AutoUnpublishResult {
  scanned: number;
  unpublished: number;
  reasons: Record<string, number>;
}

export async function runAutoUnpublish(limit = 100): Promise<AutoUnpublishResult> {
  const result: AutoUnpublishResult = { scanned: 0, unpublished: 0, reasons: {} };

  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, visibility_mode, visibility_score, cover_image, category, vertical, menu_items_json, hotel_inventory_json, menu_quality_flag, manual_lock, owner_controlled, needs_rescrape, source_snapshot_at")
    .in("visibility_mode", ["search_only", "live", "map_only"])
    .limit(limit);

  if (!merchants?.length) return result;
  result.scanned = merchants.length;

  for (const m of merchants) {
    if (m.manual_lock === true) continue;

    const reasons: string[] = [];
    const v = (m.vertical || "").toLowerCase();

    // Critical data missing
    if (!m.cover_image) reasons.push("no_cover");
    if (!m.category || ["general", "other", "unknown"].includes(m.category?.toLowerCase())) reasons.push("invalid_category");

    // Food-specific
    if (v === "food") {
      if (!m.menu_items_json) reasons.push("no_menu");
      if (m.menu_quality_flag === "empty_after_cleanup") reasons.push("empty_menu");
      if (m.menu_quality_flag === "high_duplication") reasons.push("duplicate_menu");
    }

    // Hotel-specific
    if (v === "hotel") {
      const inv = m.hotel_inventory_json;
      if (!inv || !inv.roomTypes || inv.roomTypes.length === 0) reasons.push("no_room_inventory");
    }

    // Score too low
    if ((m.visibility_score ?? 0) < 25) reasons.push("critical_low_score");

    // Stale source (90+ days)
    if (m.source_snapshot_at) {
      const age = Date.now() - new Date(m.source_snapshot_at).getTime();
      if (age > 90 * 86400_000) reasons.push("stale_source_90d");
    }

    if (reasons.length === 0) continue;

    const now = new Date().toISOString();
    const reason = reasons.join(", ");

    await db.from("seed_merchants").update({
      visibility_mode: "hidden",
      unpublished_at: now,
      unpublish_reason: reason,
      last_publish_check_at: now,
      visibility_decision_reason: `auto-unpublish: ${reason}`,
      blocking_reason: `auto-unpublish: ${reason}`,
    }).eq("id", m.id);

    result.unpublished++;
    for (const r of reasons) {
      result.reasons[r] = (result.reasons[r] || 0) + 1;
    }
  }

  console.log(`[auto-unpublish] scanned=${result.scanned} unpublished=${result.unpublished}`);
  return result;
}
