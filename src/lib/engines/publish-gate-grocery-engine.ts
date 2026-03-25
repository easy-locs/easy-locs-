/**
 * Publish Gate — GROCERY specific. Validates product catalog, not menu or rooms.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runGroceryPublishGate(limit = 50) {
  const { data: groceries } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, cover_image, grocery_catalog_json, visibility_score, visibility_mode")
    .eq("vertical", "grocery")
    .limit(limit);

  let passed = 0, blocked = 0, promoted = 0;

  for (const g of groceries ?? []) {
    const blockers: string[] = [];

    if (!g.category || ["general", "other", "unknown"].includes(g.category?.toLowerCase())) blockers.push("invalid_category");
    if (!g.cover_image) blockers.push("no_cover");
    if ((g.visibility_score ?? 0) < 25) blockers.push("low_score");

    // Grocery-specific: must have products
    const catalog = g.grocery_catalog_json;
    if (!catalog || !catalog.products || catalog.products.length === 0) {
      blockers.push("no_grocery_catalog");
    }

    if (blockers.length === 0) {
      passed++;
      if (g.visibility_mode === "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "search_only", blocking_reason: null }).eq("id", g.id);
        promoted++;
      }
    } else {
      blocked++;
      if (g.visibility_mode !== "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "hidden", blocking_reason: `grocery_gate: ${blockers.join(", ")}` }).eq("id", g.id);
      }
    }
  }

  console.log(`[grocery-publish-gate] passed=${passed} blocked=${blocked} promoted=${promoted}`);
  return { passed, blocked, promoted };
}
