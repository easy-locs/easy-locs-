import { supabase } from "@/integrations/supabase/client";

export async function listHomePromos(limit = 10) {
  const { data, error } = await supabase
    .from("seed_merchant_promos")
    .select("*, seed_merchants!inner(id, name, cover_image, category, area)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function createMerchantPromoCampaign(params: {
  merchantId: string;
  title: string;
  description?: string | null;
  discountType?: "percent" | "fixed";
  discountValue: number;
  minimumOrderAmount?: number;
}) {
  const { data, error } = await supabase
    .from("seed_merchant_promos")
    .insert({
      merchant_id: params.merchantId,
      title: params.title,
      description: params.description ?? null,
      discount_type: params.discountType ?? "percent",
      discount_value: params.discountValue,
      minimum_order_amount: params.minimumOrderAmount ?? 0,
      is_active: true,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
