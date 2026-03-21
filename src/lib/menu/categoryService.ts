/**
 * categoryService — CRUD for storefront_catalog_categories.
 * Single source of truth for menu category management.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface MenuCategory {
  id: string;
  shop_id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

/** Fetch all categories for a shop */
export async function getCategories(shopId: string): Promise<MenuCategory[]> {
  const { data } = await db
    .from("storefront_catalog_categories")
    .select("*")
    .eq("shop_id", shopId)
    .order("sort_order");
  return data ?? [];
}

/** Create a new category */
export async function createCategory(shopId: string, name: string, icon?: string): Promise<MenuCategory | null> {
  const { data: existing } = await db
    .from("storefront_catalog_categories")
    .select("sort_order")
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await db
    .from("storefront_catalog_categories")
    .insert({ shop_id: shopId, name, icon: icon ?? null, sort_order: nextOrder, active: true })
    .select("*")
    .single();

  if (error) { console.error("[categoryService] create error", error); return null; }
  return data;
}

/** Rename a category */
export async function renameCategory(categoryId: string, name: string): Promise<boolean> {
  const { error } = await db
    .from("storefront_catalog_categories")
    .update({ name })
    .eq("id", categoryId);
  return !error;
}

/** Reorder categories */
export async function reorderCategories(orderedIds: string[]): Promise<boolean> {
  const updates = orderedIds.map((id, i) =>
    db.from("storefront_catalog_categories").update({ sort_order: i }).eq("id", id)
  );
  const results = await Promise.all(updates);
  return results.every((r: any) => !r.error);
}

/** Toggle active state */
export async function toggleCategory(categoryId: string, active: boolean): Promise<boolean> {
  const { error } = await db
    .from("storefront_catalog_categories")
    .update({ active })
    .eq("id", categoryId);
  return !error;
}

/** Delete a category (only if no items) */
export async function deleteCategory(categoryId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data: items } = await db
    .from("catalog_items")
    .select("id")
    .eq("category_id", categoryId)
    .limit(1);

  if (items && items.length > 0) {
    return { ok: false, reason: "Category still has items. Move or delete items first." };
  }

  const { error } = await db
    .from("storefront_catalog_categories")
    .delete()
    .eq("id", categoryId);

  return error ? { ok: false, reason: error.message } : { ok: true };
}
