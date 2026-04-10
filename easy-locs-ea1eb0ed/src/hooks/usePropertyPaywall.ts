/**
 * usePropertyPaywall — Enforces the property management paywall.
 * 
 * Business rule:
 * - 1 property free worldwide
 * - Adding a 2nd+ property requires a paid subscription
 * - Pricing: 9.99€/month or 99€/year
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const PROPERTY_PAYWALL = {
  freeLimit: 1,
  monthlyPrice: 9.99,
  yearlyPrice: 99,
  currency: "EUR",
} as const;

export function usePropertyPaywall() {
  const { user, subscription } = useAuth();
  const [propertyCount, setPropertyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const fetchCount = async () => {
      setLoading(true);
      const { count, error } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!error && count !== null) {
        setPropertyCount(count);
      }
      setLoading(false);
    };

    fetchCount();
  }, [user?.id]);

  const isSubscribed = subscription.subscribed;
  const atFreeLimit = propertyCount >= PROPERTY_PAYWALL.freeLimit;
  const canAddProperty = !atFreeLimit || isSubscribed;
  const requiresUpgrade = atFreeLimit && !isSubscribed;

  return {
    propertyCount,
    canAddProperty,
    requiresUpgrade,
    isSubscribed,
    loading,
    freeLimit: PROPERTY_PAYWALL.freeLimit,
  };
}
