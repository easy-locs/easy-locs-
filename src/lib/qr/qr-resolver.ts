/**
 * QR Resolver — Resolves QR target codes to merchant context.
 */
import { supabase } from "@/integrations/supabase/client";

export interface QrResolvedTarget {
  targetCode: string;
  merchantProfileId: string;
  storefrontPageId: string | null;
  targetType: string;
  tableNumber: string | null;
  active: boolean;
}

export async function resolveQrTarget(targetCode: string): Promise<QrResolvedTarget> {
  const { data, error } = await (supabase as any)
    .from("qr_order_targets")
    .select("*")
    .eq("target_code", targetCode)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("QR target not found");

  return {
    targetCode: data.target_code,
    merchantProfileId: data.merchant_profile_id,
    storefrontPageId: data.storefront_page_id ?? null,
    targetType: data.target_type,
    tableNumber: data.table_number ?? null,
    active: !!data.active,
  };
}
