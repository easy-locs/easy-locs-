/**
 * useBoostPurchase — PASS141: Purchase boost tiers with LOCS credits.
 * Uses atomic RPC (purchase_boost) to prevent race conditions and double-spend.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const BOOST_TIERS = {
  basic: { label: "Basic Boost", locs: 5, durationDays: 3, impressions: 500 },
  premium: { label: "Premium Boost", locs: 15, durationDays: 7, impressions: 2000 },
  featured: { label: "Featured", locs: 40, durationDays: 14, impressions: 5000 },
} as const;

export type BoostTier = keyof typeof BOOST_TIERS;

export function useBoostPurchase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);

  const purchaseBoost = useCallback(
    async (opts: {
      targetType: string;
      targetId: string;
      shopId?: string;
      tier: BoostTier;
    }) => {
      if (!user?.id) {
        toast({ title: "Sign in required", variant: "destructive" });
        return { success: false };
      }

      setPurchasing(true);
      try {
        const config = BOOST_TIERS[opts.tier];

        // Atomic RPC — handles locking, balance check, debit, boost creation, storefront update
        const { data, error } = await (supabase as any).rpc("purchase_boost", {
          _user_id: user.id,
          _target_type: opts.targetType,
          _target_id: opts.targetId,
          _shop_id: opts.shopId || null,
          _tier: opts.tier,
          _locs_cost: config.locs,
          _duration_days: config.durationDays,
          _impressions_budget: config.impressions,
          _label: config.label,
        });

        if (error) {
          toast({ title: "Boost failed", description: error.message, variant: "destructive" });
          return { success: false };
        }

        if (!data?.success) {
          toast({ title: "Boost failed", description: data?.error || "Unknown error", variant: "destructive" });
          return { success: false };
        }

        toast({ title: "Boost activated!", description: `${config.label} for ${config.durationDays} days.` });
        return { success: true };
      } catch (err: any) {
        toast({ title: "Boost failed", description: err.message, variant: "destructive" });
        return { success: false };
      } finally {
        setPurchasing(false);
      }
    },
    [user?.id, toast]
  );

  return { purchaseBoost, purchasing, BOOST_TIERS };
}
