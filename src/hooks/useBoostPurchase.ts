/**
 * useBoostPurchase — PASS141: Purchase boost tiers with LOCS credits.
 * Deducts from wallet and creates a boost_purchases entry.
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

        // Check balance
        const { data: wallet } = await supabase
          .from("wallet_balances")
          .select("balance")
          .eq("user_id", user.id)
          .eq("currency", "LOCS")
          .maybeSingle();

        const balance = (wallet as any)?.balance || 0;
        if (balance < config.locs) {
          toast({ title: "Insufficient LOCS", description: `Need ${config.locs} LOCS, you have ${balance}.`, variant: "destructive" });
          return { success: false };
        }

        // Deduct LOCS
        await supabase
          .from("wallet_balances")
          .update({
            balance: balance - config.locs,
            total_spent: ((wallet as any)?.total_spent || 0) + config.locs,
          } as any)
          .eq("user_id", user.id)
          .eq("currency", "LOCS");

        // Record transaction
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          type: "boost",
          direction: "out",
          amount: config.locs,
          currency: "LOCS",
          description: `${config.label} — ${opts.targetType}`,
          status: "completed",
          reference_type: "boost",
          reference_id: opts.targetId,
        } as any);

        // Create boost entry
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + config.durationDays);

        await (supabase as any).from("boost_purchases").insert({
          user_id: user.id,
          target_type: opts.targetType,
          target_id: opts.targetId,
          shop_id: opts.shopId || null,
          tier: opts.tier,
          locs_spent: config.locs,
          starts_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
          impressions_budget: config.impressions,
          status: "active",
        });

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
