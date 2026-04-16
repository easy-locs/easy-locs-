import type {
  DLDTransaction,
  DLDDistrictSummary,
  DLDMarketKPI,
  DLDMonthlyTrend,
  DLDPropertyType,
} from "@/domains/real-estate/canonical-types";
import {
  FALLBACK_DLD_TRANSACTIONS,
  getTransactionsByDistrict,
  computeDistrictSummaries,
  computeMarketKPIs,
  computeMonthlyTrends,
  computeBuildingHistory,
  computeComparableSales,
  computeMarketSummary,
  getBuildingsForDistrict,
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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
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

const EDGE_FUNCTION_TIMEOUT_MS = 8000;

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
  if (_liveCallCount > 0 && _demoCallCount === 0) return "live";
  return _demoCallCount > 0 ? "demo" : "demo";
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

    const hasNonPeriodFilters = filters && (filters.propertyType || filters.district || filters.minPrice || filters.maxPrice || filters.transactionType);
    const txs = hasNonPeriodFilters
      ? applyFilters(FALLBACK_DLD_TRANSACTIONS, { ...filters, period: undefined })
      : FALLBACK_DLD_TRANSACTIONS;
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

    const hasNonPeriodFilters = filters && (filters.propertyType || filters.district || filters.minPrice || filters.maxPrice || filters.transactionType);
    const txs = hasNonPeriodFilters
      ? applyFilters(FALLBACK_DLD_TRANSACTIONS, { ...filters, period: undefined })
      : FALLBACK_DLD_TRANSACTIONS;
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

    const txs = filters ? applyFilters(FALLBACK_DLD_TRANSACTIONS, { ...filters, period: undefined }) : FALLBACK_DLD_TRANSACTIONS;
    return computeMonthlyTrends(txs, districts);
  },

  async getDistrictTransactions(
    district: string,
    filters?: DLDAnalyticsFilters,
    offset: number = 0,
    limit: number = 20,
  ): Promise<PaginatedResult<DLDTransaction>> {
    const remote = await fetchFromEdgeFunction<DLDTransaction[]>("dld-analytics/transactions", {
      district,
      period: filters?.period,
      propertyType: filters?.propertyType,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (trackSource(remote)) {
      const sorted = [...remote!].sort((a, b) => b.amount - a.amount);
      const safeOffset = Math.max(0, Math.min(offset, sorted.length));
      return {
        data: sorted.slice(safeOffset, safeOffset + limit),
        total: sorted.length,
        offset: safeOffset,
        limit,
      };
    }

    let txs = getTransactionsByDistrict(district);
    if (filters) {
      txs = applyFilters(txs, { ...filters, district: undefined });
    }
    const sorted = [...txs].sort((a, b) => b.amount - a.amount);
    const safeOffset = Math.max(0, Math.min(offset, sorted.length));
    return {
      data: sorted.slice(safeOffset, safeOffset + limit),
      total: sorted.length,
      offset: safeOffset,
      limit,
    };
  },

  async getTopTransactions(
    filters?: DLDAnalyticsFilters,
    offset: number = 0,
    limit: number = 20,
  ): Promise<PaginatedResult<DLDTransaction>> {
    const remote = await fetchFromEdgeFunction<DLDTransaction[]>("dld-analytics/top-transactions", {
      limit,
      propertyType: filters?.propertyType,
      district: filters?.district,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      transactionType: filters?.transactionType,
    });
    if (trackSource(remote)) {
      const sorted = [...remote!].sort((a, b) => b.amount - a.amount);
      const safeOffset = Math.max(0, Math.min(offset, sorted.length));
      return {
        data: sorted.slice(safeOffset, safeOffset + limit),
        total: sorted.length,
        offset: safeOffset,
        limit,
      };
    }

    const txs = filters ? applyFilters(FALLBACK_DLD_TRANSACTIONS, filters) : [...FALLBACK_DLD_TRANSACTIONS];
    const sorted = txs.sort((a, b) => b.amount - a.amount);
    const safeOffset = Math.max(0, Math.min(offset, sorted.length));
    return {
      data: sorted.slice(safeOffset, safeOffset + limit),
      total: sorted.length,
      offset: safeOffset,
      limit,
    };
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
    return [...new Set(FALLBACK_DLD_TRANSACTIONS.map(t => t.district))].sort();
  },

  getAvailablePeriods(): string[] {
    return [...new Set(FALLBACK_DLD_TRANSACTIONS.map(t => t.transactionDate.slice(0, 7)))].sort();
  },

  async getBuildingHistory(buildingName: string): Promise<DLDTransaction[]> {
    const remote = await fetchFromEdgeFunction<DLDTransaction[]>("dld-analytics/building-history", {
      building: buildingName,
    });
    if (trackSource(remote)) return remote!;

    return computeBuildingHistory(FALLBACK_DLD_TRANSACTIONS, buildingName);
  },

  async getComparableSales(
    district: string,
    propertyType?: string,
    bedrooms?: number,
    limit: number = 20
  ): Promise<{ comparables: DLDTransaction[]; medianPricePerSqft: number }> {
    const remote = await fetchFromEdgeFunction<{ comparables: DLDTransaction[]; medianPricePerSqft: number }>(
      "dld-analytics/comparables",
      { district, type: propertyType, bedrooms, limit }
    );
    if (trackSource(remote)) return remote!;

    return computeComparableSales(FALLBACK_DLD_TRANSACTIONS, district, propertyType, bedrooms, limit);
  },

  async getMarketSummary(): Promise<{
    avgPricePerSqft: number;
    totalVolume: number;
    transactionCount: number;
    volumeTrend: number;
    hottestDistrict: string;
  }> {
    const remote = await fetchFromEdgeFunction<{
      avgPricePerSqft: number;
      totalVolume: number;
      transactionCount: number;
      volumeTrend: number;
      hottestDistrict: string;
    }>("dld-analytics/summary", {});
    if (trackSource(remote)) return remote!;

    return computeMarketSummary(FALLBACK_DLD_TRANSACTIONS);
  },

  async getDataSourceStatus(): Promise<{
    configured: boolean;
    totalRecords: number;
    latestTransactionDate: string | null;
    latestSyncTimestamp: string | null;
  } | null> {
    return fetchFromEdgeFunction("dld-analytics/status", {});
  },

  async triggerSync(options?: { fromDate?: string; toDate?: string; fullSync?: boolean }): Promise<{
    affected: number;
    errors: number;
    source: string;
  } | null> {
    return fetchFromEdgeFunction("dld-analytics/sync", {
      fromDate: options?.fromDate,
      toDate: options?.toDate,
      fullSync: options?.fullSync ? "true" : undefined,
    });
  },

  getBuildingsForDistrict(district: string): string[] {
    return getBuildingsForDistrict(district);
  },

  getAllBuildings(): string[] {
    return [...new Set(FALLBACK_DLD_TRANSACTIONS.filter(t => t.buildingName).map(t => t.buildingName!))].sort();
  },

  async getBuildingsLive(district?: string): Promise<{ name: string; district: string }[] | null> {
    const remote = await fetchFromEdgeFunction<{ name: string; district: string }[]>(
      "dld-analytics/buildings",
      { district }
    );
    return remote;
  },
};
