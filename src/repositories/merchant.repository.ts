/**
 * merchant.repository — All DB ops for merchant pages (menu, performance).
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchFirstSeedMerchant() {
  const { data } = await supabase.from("seed_merchants").select("id").limit(1).maybeSingle();
  return data;
}

export async function fetchSeedProducts(merchantId: string) {
  const { data, error } = await supabase
    .from("seed_products")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function toggleProductAvailability(productId: string, isAvailable: boolean) {
  const { error } = await supabase
    .from("seed_products")
    .update({ is_available: isAvailable })
    .eq("id", productId);
  if (error) throw error;
}

export async function fetchOrderItems(limit = 5000) {
  const { data } = await supabase.from("order_items").select("*").limit(limit);
  return data ?? [];
}

export async function fetchSeedProductsByMerchant(merchantId: string) {
  const { data } = await (supabase as any).from("seed_products").select("*").eq("merchant_id", merchantId).limit(1000);
  return data ?? [];
}
