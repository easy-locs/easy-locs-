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
import { db } from "./db";

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

let _liveCallCount = 0;
let _demoCallCount = 0;

const EDGE_FUNCTION_BASE_URL = typeof import.meta !== "undefined"
  ? (import.meta.env?.VITE_SUPABASE_EDGE_URL as string | undefined)
  : undefined;

const EDGE_FUNCTION_TIMEOUT_MS = 5000;

async function probeEdgeFunction(): Promise<boolean> {
  if (!EDGE_FUNCTION_BASE_URL) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);
    const res = await fetch(`${EDGE_FUNCTION_BASE_URL}/dld-analytics/kpis`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok || res.status === 405 || res.status === 400;
  } catch {
    return false;
  }
}

async function fetchFromEdgeFunction<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): Promise<T | null> {
  if (!EDGE_FUNCTION_BASE_URL) return null;
  try {
    const url = new URL(`${EDGE_FUNCTION_BASE_URL}/${endpoint}`);
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export { probeEdgeFunction };

export function getDataSource(): "live" | "demo" {
  if (_demoCallCount > 0) return "demo";
  return _liveCallCount > 0 ? "live" : "demo";
}

export function resetDataSourceTracking(): void {
  _liveCallCount = 0;
  _demoCallCount = 0;
}

function trackSource<T>(result: T | null): boolean {
  if (result) {
    _liveCallCount++;
    return true;
  }
  _demoCallCount++;
  return false;
}

export const dldAnalyticsService = {
  async getMarketKPIs(filters?: DLDAnalyticsFilters): Promise<DLDMarketKPI> {
    const remote = await fetchFromEdgeFunction<DLDMarketKPI>("dld-analytics/kpis", {
      period: filters?.period,
      propertyType: filters?.propertyType,
      district: filters?.district,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (trackSource(remote)) return remote!;

    // DEMO FALLBACK — uses static seed data when edge function is unavailable
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
    if (trackSource(remote)) return remote!;

    // DEMO FALLBACK — uses static seed data when edge function is unavailable
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
    if (trackSource(remote)) return remote!;

    // DEMO FALLBACK — uses static seed data when edge function is unavailable
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

    // DEMO FALLBACK — uses static seed data when edge function is unavailable
    let txs = FALLBACK_DLD_TRANSACTIONS.filter(t => t.district === district);
    if (filters) {
      txs = applyFilters(txs, { ...filters, district: undefined });
    }
    return txs.sort((a, b) => b.amount - a.amount);
  },

  async getTopTransactions(limit: number = 10, filters?: DLDAnalyticsFilters): Promise<DLDTransaction[]> {
    // DEMO FALLBACK — uses static seed data; no edge function endpoint for top transactions
    const txs = filters ? applyFilters(FALLBACK_DLD_TRANSACTIONS, filters) : FALLBACK_DLD_TRANSACTIONS;
    return txs.sort((a, b) => b.amount - a.amount).slice(0, limit);
  },

  async getAvailableDistrictsFromDb(): Promise<string[] | null> {
    try {
      const { data, error } = await db("properties")
        .select("district")
        .eq("country", "AE")
        .not("district", "is", null);
      if (error || !data || data.length === 0) return null;
      const unique = [...new Set(data.map((r: { district: string }) => r.district).filter(Boolean))].sort();
      return unique.length > 0 ? unique as string[] : null;
    } catch {
      return null;
    }
  },

  getAvailableDistricts(): string[] {
    // DEMO FALLBACK — returns districts from static seed data
    return [...new Set(FALLBACK_DLD_TRANSACTIONS.map(t => t.district))].sort();
  },

  getAvailablePeriods(): string[] {
    // DEMO FALLBACK — returns periods from static seed data
    return [...new Set(FALLBACK_DLD_TRANSACTIONS.map(t => t.transactionDate.slice(0, 7)))].sort();
  },
};
