/**
 * useDealAnalytics — Aggregates deal metrics from deal_rooms + deal_events
 * PASS55 Block 9d: Deal Analytics
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export interface DealMetrics {
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
  avgNegotiationRounds: number;
  avgDealValue: number;
  totalRevenue: number;
  currency: string;
  avgTimeToClose: number; // days
  recentDeals: any[];
  funnel: { stage: string; count: number; pct: number }[];
}

const FUNNEL_ORDER = [
  "inquiry", "negotiation", "offer_sent", "counter_offer",
  "accepted", "payment_pending", "confirmed", "completed",
];

export function useDealAnalytics() {
  const { orgId } = useAuth();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deal_analytics", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const metrics = useMemo<DealMetrics>(() => {
    const total = deals.length;
    const byStatus: Record<string, number> = {};

    let totalValue = 0;
    let totalRounds = 0;
    let closedCount = 0;
    let totalCloseTime = 0;

    for (const d of deals) {
      const s = d.status as string;
      byStatus[s] = (byStatus[s] || 0) + 1;

      const amount = d.accepted_amount || d.current_offer_amount || 0;
      if (["confirmed", "completed"].includes(s) && amount > 0) {
        totalValue += amount;
        closedCount++;
        const created = new Date(d.created_at).getTime();
        const updated = new Date(d.updated_at).getTime();
        totalCloseTime += (updated - created) / (1000 * 60 * 60 * 24);
      }
      totalRounds += d.negotiation_round || 0;
    }

    const completedOrConfirmed = (byStatus["confirmed"] || 0) + (byStatus["completed"] || 0);
    const conversionRate = total > 0 ? Math.round((completedOrConfirmed / total) * 100) : 0;
    const avgRounds = total > 0 ? Math.round((totalRounds / total) * 10) / 10 : 0;
    const avgValue = closedCount > 0 ? Math.round(totalValue / closedCount) : 0;
    const avgClose = closedCount > 0 ? Math.round((totalCloseTime / closedCount) * 10) / 10 : 0;

    // Build funnel
    const funnel = FUNNEL_ORDER.map((stage) => {
      const count = byStatus[stage] || 0;
      return { stage, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    }).filter((f) => f.count > 0 || FUNNEL_ORDER.indexOf(f.stage) < 4);

    return {
      total,
      byStatus,
      conversionRate,
      avgNegotiationRounds: avgRounds,
      avgDealValue: avgValue,
      totalRevenue: totalValue,
      currency: deals[0]?.current_offer_currency || "EUR",
      avgTimeToClose: avgClose,
      recentDeals: deals.slice(0, 10),
      funnel,
    };
  }, [deals]);

  return { metrics, loading: isLoading };
}
