/**
 * Inventory Engine — Monitors stock levels, auto-hides out-of-stock items.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runInventoryCheck(limit = 100) {
  const { data: items } = await db
    .from("catalog_items")
    .select("id, title, stock_quantity, is_active, shop_id")
    .not("stock_quantity", "is", null)
    .limit(limit);

  let outOfStock = 0, hidden = 0, restocked = 0;
  for (const item of items ?? []) {
    const qty = Number(item.stock_quantity ?? 0);
    if (qty <= 0 && item.is_active) {
      await db.from("catalog_items").update({ is_active: false }).eq("id", item.id);
      hidden++;
      outOfStock++;
    } else if (qty > 0 && !item.is_active) {
      await db.from("catalog_items").update({ is_active: true }).eq("id", item.id);
      restocked++;
    } else if (qty <= 0) {
      outOfStock++;
    }
  }

  return { checked: items?.length ?? 0, outOfStock, hidden, restocked };
}
