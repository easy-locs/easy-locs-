/**
 * useStorefrontCoupon — Buyer-side coupon validation and application hook.
 * Validates code, checks eligibility, calculates discount.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
      // Fetch coupon
      const { data: coupon } = await (supabase as any)
        .from("storefront_coupons")
        .select("*")
        .eq("shop_id", shopId)
        .eq("code", code.trim().toUpperCase())
        .eq("active", true)
        .maybeSingle();

      if (!coupon) {
        setError("Invalid coupon code");
        setAppliedCoupon(null);
        return null;
      }

      // Check validity period
      if (coupon.valid_to && new Date(coupon.valid_to) < new Date()) {
        setError("Coupon expired");
        setAppliedCoupon(null);
        return null;
      }

      // Check global usage limit
      if (coupon.usage_count >= coupon.usage_limit) {
        setError("Coupon usage limit reached");
        setAppliedCoupon(null);
        return null;
      }

      // Check min order
      if (subtotal < (coupon.min_order || 0)) {
        setError(`Minimum order: ${coupon.min_order} ${coupon.currency || "EUR"}`);
        setAppliedCoupon(null);
        return null;
      }

      // Check per-user limit
      if (user && coupon.per_user_limit > 0) {
        const { count } = await (supabase as any)
          .from("storefront_coupon_usage")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", coupon.id)
          .eq("user_id", user.id);

        if ((count || 0) >= coupon.per_user_limit) {
          setError("You've already used this coupon");
          setAppliedCoupon(null);
          return null;
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.type === "percentage") {
        discountAmount = subtotal * (coupon.value / 100);
        if (coupon.max_discount) discountAmount = Math.min(discountAmount, coupon.max_discount);
      } else if (coupon.type === "fixed") {
        discountAmount = Math.min(coupon.value, subtotal);
      } else if (coupon.type === "free_delivery") {
        discountAmount = 0; // handled at checkout level
      }

      discountAmount = Math.round(discountAmount * 100) / 100;

      const applied: AppliedCoupon = {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
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

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setError(null);
  }, []);

  // Record usage after successful order
  const recordUsage = useCallback(async (orderId?: string) => {
    if (!appliedCoupon || !user) return;
    await (supabase as any).from("storefront_coupon_usage").insert({
      coupon_id: appliedCoupon.id,
      user_id: user.id,
      order_id: orderId || null,
      discount_amount: appliedCoupon.discountAmount,
    });
  }, [appliedCoupon, user]);

  return { appliedCoupon, validating, error, applyCoupon, removeCoupon, recordUsage };
}
