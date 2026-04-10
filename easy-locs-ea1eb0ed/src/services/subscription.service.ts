import { db } from "./db";


export type SubscriptionTier = "free" | "solo" | "team" | "company";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "paused";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionMetrics {
  totalActive: number;
  byTier: Record<SubscriptionTier, number>;
  mrr: number;
  churnRate: number;
}

const TIER_PRICE_MONTHLY: Record<SubscriptionTier, number> = {
  free: 0,
  solo: 29,
  team: 79,
  company: 199,
};

export const subscriptionService = {
  async fetchUserSubscription(userId: string): Promise<SubscriptionRow | null> {
    const { data, error } = await db("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .maybeSingle() as { data: SubscriptionRow | null; error: any };

    if (error) {
      if (error.code === "42P01") return null;
      throw error;
    }
    return data;
  },

  async fetchMetrics(): Promise<SubscriptionMetrics> {
    const { data, error } = await db("subscriptions")
      .select("tier, status")
      .in("status", ["active", "trialing"]) as { data: Array<{ tier: SubscriptionTier; status: string }> | null; error: any };

    if (error) {
      if (error.code === "42P01") return { totalActive: 0, byTier: { free: 0, solo: 0, team: 0, company: 0 }, mrr: 0, churnRate: 0 };
      throw error;
    }

    const rows = data ?? [];
    const byTier: Record<SubscriptionTier, number> = { free: 0, solo: 0, team: 0, company: 0 };
    for (const r of rows) {
      byTier[r.tier] = (byTier[r.tier] ?? 0) + 1;
    }

    const mrr = Object.entries(byTier).reduce((sum, [tier, count]) => {
      return sum + count * (TIER_PRICE_MONTHLY[tier as SubscriptionTier] ?? 0);
    }, 0);

    const { count: canceledCount, error: cancelErr } = await db("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled") as { count: number | null; error: any };
    if (cancelErr && cancelErr.code !== "42P01") throw cancelErr;

    const totalEver = rows.length + (canceledCount ?? 0);
    const churnRate = totalEver > 0 ? Math.round(((canceledCount ?? 0) / totalEver) * 10000) / 100 : 0;

    return {
      totalActive: rows.length,
      byTier,
      mrr,
      churnRate,
    };
  },

  async updateTier(userId: string, tier: SubscriptionTier): Promise<void> {
    const { error } = await db("subscriptions")
      .update({ tier, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
    if (error && error.code !== "42P01") throw error;
  },

  tierPrice(tier: SubscriptionTier): number {
    return TIER_PRICE_MONTHLY[tier] ?? 0;
  },
};
