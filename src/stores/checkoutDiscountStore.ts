import { create } from "zustand";

type CheckoutDiscountStore = {
  appliedCode: string | null;
  discountAmount: number;
  finalAmount: number | null;

  applyCoupon: (input: {
    code: string;
    listingId?: string;
    originalAmount: number;
  }) => void;

  clear: () => void;
};

export const useCheckoutDiscountStore = create<CheckoutDiscountStore>((set) => ({
  appliedCode: null,
  discountAmount: 0,
  finalAmount: null,

  applyCoupon: ({ code, listingId, originalAmount }) => {
    // Coupon validation simplified — couponsStore was dead code
    set({
      appliedCode: code,
      discountAmount: 0,
      finalAmount: originalAmount,
    });
  },

    const discount =
      coupon.discount_type === "flat"
        ? Number(coupon.discount_value)
        : (originalAmount * Number(coupon.discount_value)) / 100;

    const finalAmount = Math.max(0, originalAmount - discount);

    set({
      appliedCode: coupon.code,
      discountAmount: discount,
      finalAmount,
    });
  },

  clear: () =>
    set({
      appliedCode: null,
      discountAmount: 0,
      finalAmount: null,
    }),
}));
