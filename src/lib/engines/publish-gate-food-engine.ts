/**
 * Publish Gate — FOOD specific. Stricter menu validation.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeMerchantQualityScore, extractMenuItems, isInvalidCategory, isPlaceholderImage } from "./merchant-quality-helpers";

const db = supabase as any;

const GENERIC_MENU = ["item 1", "item 2", "menu item", "product", "test", "sample"];

export async function runFoodPublishGate(limit = 100) {
  const { data: shops } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, cover_image, menu_items_json, overall_quality_score, visibility_score, latitude, longitude, phone, support_phone, visibility_mode, menu_quality_flag")
    .eq("vertical", "food")
    .limit(limit);

  let passed = 0, blocked = 0, promoted = 0;

  for (const s of shops ?? []) {
    const blockers: string[] = [];

    if (isInvalidCategory(s.category)) blockers.push("invalid_category");
    if (isInvalidCategory(s.subcategory)) blockers.push("missing_subcategory");
    if (!s.cover_image) blockers.push("no_cover");
    if (isPlaceholderImage(s.cover_image)) blockers.push("placeholder_cover");

    const effectiveScore = s.overall_quality_score ?? Math.max(
      s.visibility_score ?? 0,
      computeMerchantQualityScore({
        cover_image: s.cover_image,
        menu_items_json: s.menu_items_json,
        vertical: "food",
        latitude: s.latitude,
        longitude: s.longitude,
        phone: s.phone,
        support_phone: s.support_phone,
        category: s.category,
      }),
    );
    if (effectiveScore < 50) blockers.push("low_score");

    // Food-specific: menu must exist and be clean
    const menu = s.menu_items_json;
    if (!menu) {
      blockers.push("no_menu");
    } else {
      const items = extractMenuItems(menu);
      if (items.length < 3) blockers.push("too_few_items");
      const names = items.map((i: any) => (i.name || "").toLowerCase());
      const genericCount = names.filter((n: string) => GENERIC_MENU.some(g => n.includes(g))).length;
      if (genericCount > names.length * 0.3) blockers.push("generic_menu");
    }

    if (s.menu_quality_flag === "empty_after_cleanup" || s.menu_quality_flag === "high_duplication") {
      blockers.push("menu_quality_failed");
    }

    if (blockers.length === 0) {
      passed++;
      if (s.visibility_mode === "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "search_only", blocking_reason: null }).eq("id", s.id);
        promoted++;
      }
    } else {
      blocked++;
      if (s.visibility_mode !== "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "hidden", blocking_reason: `food_gate: ${blockers.join(", ")}` }).eq("id", s.id);
      }
    }
  }

  console.log(`[food-publish-gate] passed=${passed} blocked=${blocked} promoted=${promoted}`);
  return { passed, blocked, promoted };
}
