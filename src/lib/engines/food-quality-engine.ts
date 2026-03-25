/**
 * Food Pipeline Quality Engine — Validates menu items before visibility.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const GENERIC_NAMES = ["item 1", "item 2", "item 3", "test", "menu item", "product", "dish", "plat"];

export async function runFoodQualityCheck(limit = 100) {
  const { data: items } = await db
    .from("catalog_items")
    .select("id, title, price, description, photo_url, is_active, shop_id")
    .eq("is_active", true)
    .limit(limit);

  let checked = 0, flagged = 0, hidden = 0;
  for (const item of items ?? []) {
    checked++;
    const problems: string[] = [];

    const name = (item.title ?? "").toLowerCase().trim();
    if (GENERIC_NAMES.some(g => name === g || name.startsWith(g))) problems.push("generic_name");
    if (!item.price || Number(item.price) <= 0) problems.push("invalid_price");
    if (name.length < 2) problems.push("name_too_short");

    if (problems.length > 0) {
      flagged++;
      if (problems.includes("generic_name") || problems.includes("name_too_short")) {
        await db.from("catalog_items").update({ is_active: false }).eq("id", item.id);
        hidden++;
      }
    }
  }

  return { checked, flagged, hidden };
}
