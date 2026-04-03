/**
 * useStorefrontCoupon — Buyer-side coupon validation and application hook.
 * DB calls delegated to storefront-repository.
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCouponByCode, countCouponUsage, recordCouponUsage } from "@/repositories/storefront-repository";

export interface AppliedCoupon {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_delivery";
  value: number;
  discountAmount: number;
}

export function useStorefrontCoupon(shopId: string | undefined) {
  const { user } = useAuth();
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyCoupon = useCallback(async (code: string, subtotal: number): Promise<AppliedCoupon | null> => {
    if (!shopId || !code.trim()) return null;
    setValidating(true);
    setError(null);

    try {
      const coupon = await fetchCouponByCode(shopId, code);
      if (!coupon) { setError("Invalid coupon code"); setAppliedCoupon(null); return null; }
      if (coupon.valid_to && new Date(coupon.valid_to) < new Date()) { setError("Coupon expired"); setAppliedCoupon(null); return null; }
      if (coupon.usage_count >= coupon.usage_limit) { setError("Coupon usage limit reached"); setAppliedCoupon(null); return null; }
      if (subtotal < (coupon.min_order || 0)) { setError(`Minimum order: ${coupon.min_order} ${coupon.currency || "EUR"}`); setAppliedCoupon(null); return null; }

      if (user && coupon.per_user_limit > 0) {
        const count = await countCouponUsage(coupon.id, user.id);
        if (count >= coupon.per_user_limit) { setError("You've already used this coupon"); setAppliedCoupon(null); return null; }
      }

      let discountAmount = 0;
      if (coupon.type === "percentage") {
        discountAmount = subtotal * (coupon.value / 100);
        if (coupon.max_discount) discountAmount = Math.min(discountAmount, coupon.max_discount);
      } else if (coupon.type === "fixed") {
        discountAmount = Math.min(coupon.value, subtotal);
      }
      discountAmount = Math.round(discountAmount * 100) / 100;

      const applied: AppliedCoupon = {
        id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discountAmount,
      };
      setAppliedCoupon(applied);
      return applied;
    } catch {
      setError("Failed to validate coupon");
      setAppliedCoupon(null);
      return null;
    } finally {
      setValidating(false);
    }
  }, [shopId, user]);

  const removeCoupon = useCallback(() => { setAppliedCoupon(null); setError(null); }, []);

  const recordUsage = useCallback(async (orderId?: string) => {
    if (!appliedCoupon || !user) return;
    await recordCouponUsage(appliedCoupon.id, user.id, orderId || null, appliedCoupon.discountAmount);
  }, [appliedCoupon, user]);

  return { appliedCoupon, validating, error, applyCoupon, removeCoupon, recordUsage };
}
