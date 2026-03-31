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

  applyCoupon: ({ code, originalAmount }) => {
    // Simplified — coupon validation to be re-implemented via repository layer
    set({
      appliedCode: code,
      discountAmount: 0,
      finalAmount: originalAmount,
    });
  },

  clear: () =>
    set({
      appliedCode: null,
      discountAmount: 0,
      finalAmount: null,
    }),
}));
