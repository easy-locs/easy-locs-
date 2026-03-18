import { supabase } from "@/integrations/supabase/client";

export async function createMerchantCoverageArea(params: {
  workspaceId?: string;
  merchantProfileId: string;
  kitchenId?: string;
  areaName: string;
  city?: string;
  minOrderAmount?: number;
  deliveryFee?: number;
  estimatedEtaMin?: number;
  polygon?: any[];
}) {
  const { data, error } = await (supabase as any)
    .from("merchant_coverage_areas")
    .insert({
      workspace_id: params.workspaceId ?? null,
      merchant_profile_id: params.merchantProfileId,
      kitchen_id: params.kitchenId ?? null,
      area_name: params.areaName,
      city: params.city ?? "Dubai",
      min_order_amount: params.minOrderAmount ?? 0,
      delivery_fee: params.deliveryFee ?? 0,
      estimated_eta_min: params.estimatedEtaMin ?? 30,
      is_active: true,
      polygon: params.polygon ?? [],
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getCoverageAreasForMerchant(merchantProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("merchant_coverage_areas")
    .select("*")
    .eq("merchant_profile_id", merchantProfileId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBestCoverageForArea(params: {
  merchantProfileId: string;
  areaName?: string;
}) {
  const rows = await getCoverageAreasForMerchant(params.merchantProfileId);
  return rows.find((row: any) => row.area_name === params.areaName) ?? rows[0] ?? null;
}
