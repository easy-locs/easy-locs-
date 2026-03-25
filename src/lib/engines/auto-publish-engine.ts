/**
 * Auto-Publish Engine — Automatically publishes shops that pass all quality gates.
 * Respects owner_controlled and manual_lock flags.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const INVALID_CATS = ["general", "other", "unknown", "", null, undefined];

interface AutoPublishResult {
  scanned: number;
  eligible: number;
  published_search_only: number;
  published_live: number;
  skipped_manual_lock: number;
  skipped_owner_controlled: number;
  failed: number;
}

function isValidCategory(cat?: string | null): boolean {
  if (!cat) return false;
  return !INVALID_CATS.includes(cat.toLowerCase());
}

function foodGatePassed(m: any): boolean {
  if (!m.menu_items_json) return false;
  const items = Array.isArray(m.menu_items_json) ? m.menu_items_json : m.menu_items_json?.sections?.flatMap((s: any) => s.items || []) || [];
  if (items.length < 3) return false;
  if (m.menu_quality_flag === "empty_after_cleanup" || m.menu_quality_flag === "high_duplication") return false;
  return true;
}

function hotelGatePassed(m: any): boolean {
  const inv = m.hotel_inventory_json;
  if (!inv || !inv.roomTypes || inv.roomTypes.length === 0) return false;
  return true;
}

function genericGatePassed(m: any): boolean {
  return !!m.cover_image;
}

export async function runAutoPublish(limit = 100): Promise<AutoPublishResult> {
  const result: AutoPublishResult = {
    scanned: 0, eligible: 0, published_search_only: 0, published_live: 0,
    skipped_manual_lock: 0, skipped_owner_controlled: 0, failed: 0,
  };

  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, vertical, category, subcategory, cover_image, menu_items_json, hotel_inventory_json, menu_quality_flag, visibility_score, visibility_mode, blocking_reason, manual_lock, owner_controlled")
    .in("visibility_mode", ["hidden", "search_only"])
    .limit(limit);

  if (!merchants?.length) return result;
  result.scanned = merchants.length;

  for (const m of merchants) {
    if (m.manual_lock === true) { result.skipped_manual_lock++; continue; }
    if (m.owner_controlled === true) { result.skipped_owner_controlled++; continue; }

    const blockers: string[] = [];

    if (!m.vertical) blockers.push("no_vertical");
    if (!isValidCategory(m.category)) blockers.push("invalid_category");
    if (!isValidCategory(m.subcategory)) blockers.push("invalid_subcategory");
    if (!m.cover_image) blockers.push("no_cover");
    if ((m.visibility_score ?? 0) < 40) blockers.push("low_score");

    // Vertical-specific gates
    const v = (m.vertical || "").toLowerCase();
    if (v === "food" && !foodGatePassed(m)) blockers.push("food_gate_failed");
    if (v === "hotel" && !hotelGatePassed(m)) blockers.push("hotel_gate_failed");
    if (!["food", "hotel"].includes(v) && !genericGatePassed(m)) blockers.push("generic_gate_failed");

    if (m.blocking_reason && !m.blocking_reason.startsWith("Publish gate") && !m.blocking_reason.startsWith("food_gate") && !m.blocking_reason.startsWith("hotel_gate")) {
      blockers.push("external_block");
    }

    if (blockers.length > 0) {
      result.failed++;
      continue;
    }

    result.eligible++;
    const score = m.visibility_score ?? 0;
    const newMode = score >= 70 ? "live" : "search_only";

    if (m.visibility_mode === newMode) continue; // already correct

    const now = new Date().toISOString();
    const { error } = await db.from("seed_merchants").update({
      visibility_mode: newMode,
      blocking_reason: null,
      published_at: now,
      auto_published_at: now,
      publish_source: "system",
      publish_gate_status: "passed",
      last_publish_check_at: now,
      visibility_decision_reason: `auto-publish: score=${score}, mode=${newMode}`,
    }).eq("id", m.id);

    if (error) { result.failed++; continue; }

    if (newMode === "live") result.published_live++;
    else result.published_search_only++;
  }

  console.log(`[auto-publish] scanned=${result.scanned} eligible=${result.eligible} live=${result.published_live} search=${result.published_search_only}`);
  return result;
}
