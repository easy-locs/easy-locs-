import { supabase } from "@/integrations/supabase/client";

export type CouponValidationResult = {
  valid: boolean;
  message: string;
  promo?: any | null;
  discountAmount?: number;
  finalTotal?: number;
};

export async function listMerchantCoupons(merchantId: string) {
  const { data, error } = await supabase
    .from("seed_merchant_promos")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function validateCoupon(params: {
  merchantId: string;
  code: string;
  subtotal: number;
}): Promise<CouponValidationResult> {
  const raw = params.code.trim().toLowerCase();
  if (!raw) {
    return { valid: false, message: "Enter a coupon code" };
  }

  const { data, error } = await supabase
    .from("seed_merchant_promos")
    .select("*")
    .eq("merchant_id", params.merchantId)
    .eq("is_active", true);

  if (error) throw error;

  const promos = data ?? [];
  const promo =
    promos.find((row: any) => String(row.title ?? "").trim().toLowerCase() === raw) ?? null;

  if (!promo) {
    return { valid: false, message: "Coupon not found" };
  }

  const min = Number(promo.minimum_order_amount ?? 0);
  if (params.subtotal < min) {
    return { valid: false, message: `Minimum order is ${min.toFixed(2)} AED`, promo };
  }

  let discount = 0;
  if (promo.discount_type === "percent") {
    discount = (params.subtotal * Number(promo.discount_value ?? 0)) / 100;
  } else {
    discount = Number(promo.discount_value ?? 0);
  }

  discount = Math.max(0, Math.min(discount, params.subtotal));
  const finalTotal = Math.max(0, params.subtotal - discount);

  return {
    valid: true,
    message: "Coupon applied",
    promo,
    discountAmount: Number(discount.toFixed(2)),
    finalTotal: Number(finalTotal.toFixed(2)),
  };
}

export async function createCoupon(params: {
  merchantId: string;
  title: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minimumOrderAmount?: number;
  description?: string | null;
}) {
  const { data, error } = await supabase
    .from("seed_merchant_promos")
    .insert({
      merchant_id: params.merchantId,
      title: params.title.trim(),
      description: params.description ?? null,
      discount_type: params.discountType,
      discount_value: Number(params.discountValue ?? 0),
      minimum_order_amount: Number(params.minimumOrderAmount ?? 0),
      is_active: true,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
