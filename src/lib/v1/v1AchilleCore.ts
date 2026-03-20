import { supabase } from "@/integrations/supabase/client";

export async function getV1AchilleMerchants(params?: {
  area?: string | null;
  limit?: number;
}) {
  let query = (supabase as any)
    .from("marketplace_listings")
    .select("*")
    .eq("category", "food")
    .eq("is_open", true)
    .order("visibility_score", { ascending: false })
    .limit(params?.limit ?? 30);

  if (params?.area) {
    query = query.eq("area", params.area);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getV1MerchantMenu(merchantId: string) {
  const { data, error } = await (supabase as any)
    .from("seed_products")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getV1MerchantById(merchantId: string) {
  const { data, error } = await (supabase as any)
    .from("marketplace_listings")
    .select("*")
    .eq("id", merchantId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}
