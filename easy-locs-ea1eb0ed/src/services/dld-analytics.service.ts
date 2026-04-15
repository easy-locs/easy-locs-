import type {
  DLDTransaction,
  DLDDistrictSummary,
  DLDMarketKPI,
  DLDMonthlyTrend,
  DLDPropertyType,
} from "@/domains/real-estate/canonical-types";
import {
  FALLBACK_DLD_TRANSACTIONS,
  computeDistrictSummaries,
  computeMarketKPIs,
  computeMonthlyTrends,
} from "@/data/fallback-dld-transactions";

export interface DLDAnalyticsFilters {
  period?: string;
  propertyType?: DLDPropertyType;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  transactionType?: "sale" | "mortgage" | "gift";
}

function matchesPeriod(dateStr: string, period: string): boolean {
  if (period.includes("Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q);
    const month = parseInt(dateStr.slice(5, 7));
    const txYear = dateStr.slice(0, 4);
    if (txYear !== year) return false;
    if (qNum === 1) return month >= 1 && month <= 3;
    if (qNum === 2) return month >= 4 && month <= 6;
    if (qNum === 3) return month >= 7 && month <= 9;
    return month >= 10 && month <= 12;
  }
  return dateStr.startsWith(period);
}

function applyFilters(transactions: DLDTransaction[], filters: DLDAnalyticsFilters): DLDTransaction[] {
  let result = transactions;

  if (filters.period) {
    result = result.filter(t => matchesPeriod(t.transactionDate, filters.period!));
  }
  if (filters.propertyType) {
    result = result.filter(t => t.propertyType === filters.propertyType);
  }
  if (filters.district) {
    result = result.filter(t => t.district === filters.district);
  }
  if (filters.minPrice) {
    result = result.filter(t => t.amount >= filters.minPrice!);
  }
  if (filters.maxPrice) {
    result = result.filter(t => t.amount <= filters.maxPrice!);
  }
  if (filters.transactionType) {
    result = result.filter(t => t.transactionType === filters.transactionType);
  }

  return result;
}

let edgeFunctionAvailable = true;
let edgeFailureExpiry = 0;
const EDGE_COOLDOWN_MS = 5 * 60 * 1000;
let activeProbe: Promise<boolean> | null = null;

async function probeEdgeFunction(): Promise<boolean> {
  if (!edgeFunctionAvailable && Date.now() < edgeFailureExpiry) return false;
  if (activeProbe) return activeProbe;

  activeProbe = (async () => {
    try {
      const { db } = await import("@/services/db");
      const { error } = await db.functions.invoke(`dld-analytics`, {
        body: null,
        headers: { "x-endpoint": "kpis", "x-params": "" },
      });
      if (error) {
        edgeFunctionAvailable = false;
        edgeFailureExpiry = Date.now() + EDGE_COOLDOWN_MS;
        return false;
      }
      edgeFunctionAvailable = true;
      return true;
    } catch {
      edgeFunctionAvailable = false;
      edgeFailureExpiry = Date.now() + EDGE_COOLDOWN_MS;
      return false;
    } finally {
      activeProbe = null;
    }
  })();
  return activeProbe;
}

async function fetchFromEdgeFunction<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): Promise<T | null> {
  if (!edgeFunctionAvailable && Date.now() < edgeFailureExpiry) return null;

  try {
    const { db } = await import("@/services/db");
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) searchParams.set(k, String(v));
    }
    const epName = endpoint.split("/").pop() || endpoint;
    const { data, error } = await db.functions.invoke(`dld-analytics`, {
      body: null,
      headers: { "x-endpoint": epName, "x-params": searchParams.toString() },
    });
    if (error || !data) {
      edgeFunctionAvailable = false;
      edgeFailureExpiry = Date.now() + EDGE_COOLDOWN_MS;
      return null;
    }
    edgeFunctionAvailable = true;
    return data as T;
  } catch {
    edgeFunctionAvailable = false;
    edgeFailureExpiry = Date.now() + EDGE_COOLDOWN_MS;
    return null;
  }
}

export { probeEdgeFunction };

export const dldAnalyticsService = {
  async getMarketKPIs(filters?: DLDAnalyticsFilters): Promise<DLDMarketKPI> {
    const remote = await fetchFromEdgeFunction<DLDMarketKPI>("dld-analytics/kpis", {
      period: filters?.period,
      propertyType: filters?.propertyType,
      district: filters?.district,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (remote) return remote;

    const nonPeriodFilters = filters ? { ...filters, period: undefined } : undefined;
    const txs = nonPeriodFilters ? applyFilters(FALLBACK_DLD_TRANSACTIONS, nonPeriodFilters) : FALLBACK_DLD_TRANSACTIONS;
    return computeMarketKPIs(txs, filters?.period);
  },

  async getDistrictSummaries(filters?: DLDAnalyticsFilters): Promise<DLDDistrictSummary[]> {
    const remote = await fetchFromEdgeFunction<DLDDistrictSummary[]>("dld-analytics/districts", {
      period: filters?.period,
      propertyType: filters?.propertyType,
      district: filters?.district,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (remote) return remote;

    const nonPeriodFilters = filters ? { ...filters, period: undefined } : undefined;
    const txs = nonPeriodFilters ? applyFilters(FALLBACK_DLD_TRANSACTIONS, nonPeriodFilters) : FALLBACK_DLD_TRANSACTIONS;
    return computeDistrictSummaries(txs, filters?.period);
  },

  async getMonthlyTrends(districts?: string[], filters?: DLDAnalyticsFilters): Promise<DLDMonthlyTrend[]> {
    const remote = await fetchFromEdgeFunction<DLDMonthlyTrend[]>("dld-analytics/trends", {
      period: filters?.period,
      propertyType: filters?.propertyType,
      district: filters?.district,
      districts: districts?.join(","),
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (remote) return remote;

    const txs = filters ? applyFilters(FALLBACK_DLD_TRANSACTIONS, { ...filters, period: undefined }) : FALLBACK_DLD_TRANSACTIONS;
    return computeMonthlyTrends(txs, districts);
  },

  async getDistrictTransactions(district: string, filters?: DLDAnalyticsFilters): Promise<DLDTransaction[]> {
    const remote = await fetchFromEdgeFunction<DLDTransaction[]>("dld-analytics/transactions", {
      district,
      period: filters?.period,
      propertyType: filters?.propertyType,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (remote) return remote;

    let txs = FALLBACK_DLD_TRANSACTIONS.filter(t => t.district === district);
    if (filters) {
      txs = applyFilters(txs, { ...filters, district: undefined });
    }
    return txs.sort((a, b) => b.amount - a.amount);
  },

  async getTopTransactions(limit: number = 10, filters?: DLDAnalyticsFilters): Promise<DLDTransaction[]> {
    const txs = filters ? applyFilters(FALLBACK_DLD_TRANSACTIONS, filters) : FALLBACK_DLD_TRANSACTIONS;
    return txs.sort((a, b) => b.amount - a.amount).slice(0, limit);
  },

  getAvailableDistricts(): string[] {
    return [...new Set(FALLBACK_DLD_TRANSACTIONS.map(t => t.district))].sort();
  },

  getAvailablePeriods(): string[] {
    return [...new Set(FALLBACK_DLD_TRANSACTIONS.map(t => t.transactionDate.slice(0, 7)))].sort();
  },
};
