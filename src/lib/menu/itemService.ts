/**
 * itemService — CRUD for catalog_items.
 * Persists menu items to DB, supports badges and availability toggles.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface MenuItem {
  id: string;
  shop_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  photo_url: string | null;
  photo_urls: any;
  video_url: string | null;
  available: boolean;
  item_type: string | null;
  tags: string[] | null;
  sort_order: number;
  compare_at_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItemInput {
  shop_id: string;
  user_id: string;
  category_id?: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  photo_url?: string;
  photo_urls?: string[];
  video_url?: string;
  available?: boolean;
  item_type?: string;
  tags?: string[];
  compare_at_price?: number;
}

/** Fetch all items for a shop */
export async function getItems(shopId: string): Promise<MenuItem[]> {
  const { data } = await db
    .from("catalog_items")
    .select("*, storefront_catalog_categories(name)")
    .eq("shop_id", shopId)
    .order("sort_order");
  return data ?? [];
}

/** Fetch items by category */
export async function getItemsByCategory(shopId: string, categoryId: string): Promise<MenuItem[]> {
  const { data } = await db
    .from("catalog_items")
    .select("*")
    .eq("shop_id", shopId)
    .eq("category_id", categoryId)
    .eq("available", true)
    .order("sort_order");
  return data ?? [];
}

/** Create a menu item */
export async function createItem(input: CreateItemInput): Promise<MenuItem | null> {
  const { data: existing } = await db
    .from("catalog_items")
    .select("sort_order")
    .eq("shop_id", input.shop_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await db
    .from("catalog_items")
    .insert({
      shop_id: input.shop_id,
      user_id: input.user_id,
      category_id: input.category_id ?? null,
      title: input.title,
      description: input.description ?? null,
      price: input.price,
      currency: input.currency ?? "AED",
      photo_url: input.photo_url ?? null,
      photo_urls: input.photo_urls ?? null,
      video_url: input.video_url ?? null,
      available: input.available ?? true,
      item_type: input.item_type ?? "product",
      tags: input.tags ?? null,
      compare_at_price: input.compare_at_price ?? null,
      sort_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) { console.error("[itemService] create error", error); return null; }
  return data;
}

/** Update a menu item */
export async function updateItem(
  itemId: string,
  updates: Partial<Omit<CreateItemInput, "shop_id" | "user_id">>
): Promise<boolean> {
  const { error } = await db
    .from("catalog_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  return !error;
}

/** Toggle item availability */
export async function toggleItemAvailability(itemId: string, available: boolean): Promise<boolean> {
  const { error } = await db
    .from("catalog_items")
    .update({ available, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  return !error;
}

/** Delete an item */
export async function deleteItem(itemId: string): Promise<boolean> {
  const { error } = await db
    .from("catalog_items")
    .delete()
    .eq("id", itemId);
  return !error;
}

/** Apply badge/tags to item */
export async function setItemBadges(itemId: string, tags: string[]): Promise<boolean> {
  const { error } = await db
    .from("catalog_items")
    .update({ tags, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  return !error;
}
