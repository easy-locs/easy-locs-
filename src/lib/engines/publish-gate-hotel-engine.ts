/**
 * Publish Gate — HOTEL specific. Validates room inventory, not menu.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runHotelPublishGate(limit = 50) {
  const { data: hotels } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, cover_image, hotel_inventory_json, visibility_score, visibility_mode")
    .eq("vertical", "hotel")
    .limit(limit);

  let passed = 0, blocked = 0, promoted = 0;

  for (const h of hotels ?? []) {
    const blockers: string[] = [];

    if (!h.category || ["general", "other", "unknown"].includes(h.category?.toLowerCase())) blockers.push("invalid_category");
    if (!h.cover_image) blockers.push("no_cover");
    if ((h.visibility_score ?? 0) < 30) blockers.push("low_score");

    // Hotel-specific: must have room types
    const inv = h.hotel_inventory_json;
    if (!inv || !inv.roomTypes || inv.roomTypes.length === 0) {
      blockers.push("no_room_inventory");
    }

    if (blockers.length === 0) {
      passed++;
      if (h.visibility_mode === "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "search_only", blocking_reason: null }).eq("id", h.id);
        promoted++;
      }
    } else {
      blocked++;
      if (h.visibility_mode !== "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "hidden", blocking_reason: `hotel_gate: ${blockers.join(", ")}` }).eq("id", h.id);
      }
    }
  }

  console.log(`[hotel-publish-gate] passed=${passed} blocked=${blocked} promoted=${promoted}`);
  return { passed, blocked, promoted };
}
