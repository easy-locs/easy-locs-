import { supabase } from "@/integrations/supabase/client";

export async function listMerchantMenu(merchantId: string) {
  const { data, error } = await (supabase as any)
    .from("seed_products")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function toggleProductAvailability(productId: string, isAvailable: boolean) {
  const { error } = await (supabase as any)
    .from("seed_products")
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) throw error;
}
