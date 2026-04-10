import { db } from "./db";
import { type RevenueStream, calculateCommission } from "@/lib/monetization-config";


export type { RevenueStream };

export interface RevenueEventRow {
  id: string;
  stream: RevenueStream;
  amount: number;
  currency: string;
  source_entity_id: string | null;
  source_entity_type: string | null;
  user_id: string | null;
  merchant_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  byStream: Partial<Record<RevenueStream, number>>;
  transactionCount: number;
  avgRevenuePerTransaction: number;
  period: string;
}

const EMPTY_METRICS: RevenueMetrics = {
  totalRevenue: 0,
  byStream: {},
  transactionCount: 0,
  avgRevenuePerTransaction: 0,
  period: "0d",
};

export const revenueService = {
  calculateCommission,

  async trackRevenue(event: Omit<RevenueEventRow, "id" | "created_at">): Promise<void> {
    const { error } = await db("revenue_events").insert(event);
    if (error) {
      if (error.code === "42P01") return;
      throw error;
    }
  },

  async fetchMetrics(periodDays = 30): Promise<RevenueMetrics> {
    const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();
    const { data, error } = await db("revenue_events")
      .select("stream, amount, currency")
      .gte("created_at", since) as { data: Array<{ stream: RevenueStream; amount: number; currency: string }> | null; error: any };

    if (error) {
      if (error.code === "42P01") return { ...EMPTY_METRICS, period: `${periodDays}d` };
      throw error;
    }

    const rows = data ?? [];
    const byStream: Partial<Record<RevenueStream, number>> = {};
    let total = 0;

    for (const row of rows) {
      byStream[row.stream] = (byStream[row.stream] ?? 0) + row.amount;
      total += row.amount;
    }

    return {
      totalRevenue: Math.round(total * 100) / 100,
      byStream,
      transactionCount: rows.length,
      avgRevenuePerTransaction: rows.length > 0 ? Math.round((total / rows.length) * 100) / 100 : 0,
      period: `${periodDays}d`,
    };
  },

  async fetchRevenueByUser(userId: string, limit = 20): Promise<RevenueEventRow[]> {
    const { data, error } = await db("revenue_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: RevenueEventRow[] | null; error: any };
    if (error) {
      if (error.code === "42P01") return [];
      throw error;
    }
    return data ?? [];
  },

  async fetchTopMerchants(limit = 10): Promise<Array<{ merchant_id: string; total: number }>> {
    const { data, error } = await db("revenue_events")
      .select("merchant_id, amount")
      .not("merchant_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500) as { data: Array<{ merchant_id: string; amount: number }> | null; error: any };

    if (error) {
      if (error.code === "42P01") return [];
      throw error;
    }

    const byMerchant: Record<string, number> = {};
    for (const row of data ?? []) {
      byMerchant[row.merchant_id] = (byMerchant[row.merchant_id] ?? 0) + row.amount;
    }

    return Object.entries(byMerchant)
      .map(([merchant_id, total]) => ({ merchant_id, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },
};
