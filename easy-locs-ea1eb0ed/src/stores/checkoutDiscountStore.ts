import { create } from "zustand";

type CouponType = "percentage" | "fixed" | "free_delivery";

interface AppliedCoupon {
  code: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
}

type CheckoutDiscountStore = {
  appliedCode: string | null;
  appliedCoupon: AppliedCoupon | null;
  discountAmount: number;
  finalAmount: number | null;
  loading: boolean;
  error: string | null;

  applyCoupon: (input: {
    code: string;
    listingId?: string;
    shopId?: string;
    originalAmount: number;
  }) => Promise<void>;

  clear: () => void;
};

async function validateCoupon(
  code: string,
  originalAmount: number,
  shopId?: string,
): Promise<{ valid: boolean; coupon?: AppliedCoupon; error?: string }> {
  try {
    const { db } = await import("@/services/db");
    const { data, error } = await db
      .from("storefront_coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, error: "Invalid or expired coupon code" };
    }

    if (data.min_order_amount && originalAmount < data.min_order_amount) {
      return { valid: false, error: `Minimum order ${data.min_order_amount} required` };
    }

    if (shopId && data.shop_id && data.shop_id !== shopId) {
      return { valid: false, error: "Coupon not valid for this shop" };
    }

    const coupon: AppliedCoupon = {
      code: data.code,
      type: data.discount_type ?? "percentage",
      value: data.discount_value ?? 0,
      minOrder: data.min_order_amount ?? undefined,
      maxDiscount: data.max_discount ?? undefined,
    };

    return { valid: true, coupon };
  } catch {
    return { valid: true, coupon: { code: code.toUpperCase(), type: "percentage", value: 0 } };
  }
}

function calculateDiscount(coupon: AppliedCoupon, originalAmount: number): number {
  let discount = 0;
  switch (coupon.type) {
    case "percentage":
      discount = originalAmount * (coupon.value / 100);
      break;
    case "fixed":
      discount = coupon.value;
      break;
    case "free_delivery":
      discount = 0;
      break;
  }
  if (coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return Number(Math.min(discount, originalAmount).toFixed(2));
}

export const useCheckoutDiscountStore = create<CheckoutDiscountStore>((set) => ({
  appliedCode: null,
  appliedCoupon: null,
  discountAmount: 0,
  finalAmount: null,
  loading: false,
  error: null,

  applyCoupon: async ({ code, originalAmount, shopId }) => {
    set({ loading: true, error: null });
    const result = await validateCoupon(code, originalAmount, shopId);

    if (!result.valid || !result.coupon) {
      set({
        loading: false,
        error: result.error ?? "Invalid coupon",
        appliedCode: null,
        appliedCoupon: null,
        discountAmount: 0,
        finalAmount: originalAmount,
      });
      return;
    }

    const discount = calculateDiscount(result.coupon, originalAmount);
    set({
      loading: false,
      error: null,
      appliedCode: code.toUpperCase(),
      appliedCoupon: result.coupon,
      discountAmount: discount,
      finalAmount: Number((originalAmount - discount).toFixed(2)),
    });
  },

  clear: () =>
    set({
      appliedCode: null,
      appliedCoupon: null,
      discountAmount: 0,
      finalAmount: null,
      loading: false,
      error: null,
    }),
}));
