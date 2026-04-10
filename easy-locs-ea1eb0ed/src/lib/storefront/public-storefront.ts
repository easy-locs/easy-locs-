/**
 * Public storefront — fetch menu categories and items for a merchant.
 */
import { db } from "@/services/db";

export async function getStorefrontCategories(merchantProfileId: string) {
  const { data, error } = await db
    .from("menu_categories")
    .select("*")
    .eq("merchant_profile_id", merchantProfileId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getStorefrontItems(merchantProfileId: string) {
  const { data, error } = await db
    .from("menu_items")
    .select("*")
    .eq("merchant_profile_id", merchantProfileId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
