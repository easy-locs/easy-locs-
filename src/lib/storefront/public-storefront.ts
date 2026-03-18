/**
 * Public storefront — fetch menu categories and items for a merchant.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getStorefrontCategories(merchantProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("menu_categories")
    .select("*")
    .eq("merchant_profile_id", merchantProfileId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getStorefrontItems(merchantProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("menu_items")
    .select("*")
    .eq("merchant_profile_id", merchantProfileId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
