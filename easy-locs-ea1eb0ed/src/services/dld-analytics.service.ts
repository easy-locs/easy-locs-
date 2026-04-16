import type {
  DLDTransaction,
  DLDDistrictSummary,
  DLDMarketKPI,
  DLDMonthlyTrend,
  DLDPropertyType,
} from "@/domains/real-estate/canonical-types";
import {
  ensureTransactionsReady,
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

export interface Sourced<T> {
  data: T;
  source: "live" | "demo";
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

export function deriveDataSource(sources: Array<"live" | "demo">): "live" | "demo" {
  if (sources.length === 0) return "demo";
  if (sources.every(s => s === "live")) return "live";
  return "demo";
}

export const dldAnalyticsService = {
  async getMarketKPIs(filters?: DLDAnalyticsFilters): Promise<Sourced<DLDMarketKPI>> {
    const remote = await fetchFromEdgeFunction<DLDMarketKPI>("dld-analytics/kpis", {
      period: filters?.period,
      propertyType: filters?.propertyType,
      district: filters?.district,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (remote) return { data: remote, source: "live" };

    const allTxs = await ensureTransactionsReady();
    const hasNonPeriodFilters = filters && (filters.propertyType || filters.district || filters.minPrice || filters.maxPrice || filters.transactionType);
    const txs = hasNonPeriodFilters
      ? applyFilters(allTxs, { ...filters, period: undefined })
      : allTxs;
    return { data: computeMarketKPIs(txs, filters?.period), source: "demo" };
  },

  async getDistrictSummaries(filters?: DLDAnalyticsFilters): Promise<Sourced<DLDDistrictSummary[]>> {
    const remote = await fetchFromEdgeFunction<DLDDistrictSummary[]>("dld-analytics/districts", {
      period: filters?.period,
      propertyType: filters?.propertyType,
      district: filters?.district,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (remote) return { data: remote, source: "live" };

    const allTxs = await ensureTransactionsReady();
    const hasNonPeriodFilters = filters && (filters.propertyType || filters.district || filters.minPrice || filters.maxPrice || filters.transactionType);
    const txs = hasNonPeriodFilters
      ? applyFilters(allTxs, { ...filters, period: undefined })
      : allTxs;
    return { data: computeDistrictSummaries(txs, filters?.period), source: "demo" };
  },

  async getMonthlyTrends(districts?: string[], filters?: DLDAnalyticsFilters): Promise<Sourced<DLDMonthlyTrend[]>> {
    const remote = await fetchFromEdgeFunction<DLDMonthlyTrend[]>("dld-analytics/trends", {
      period: filters?.period,
      propertyType: filters?.propertyType,
      district: filters?.district,
      districts: districts?.join(","),
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
    if (remote) return { data: remote, source: "live" };

    const allTxs = await ensureTransactionsReady();
    const txs = filters ? applyFilters(allTxs, { ...filters, period: undefined }) : allTxs;
    return { data: computeMonthlyTrends(txs, districts), source: "demo" };
  },

  async getDistrictTransactions(
    district: string,
    filters?: DLDAnalyticsFilters,
    offset: number = 0,
    limit: number = 20,
  ): Promise<Sourced<PaginatedResult<DLDTransaction>>> {
    const remote = await fetchFromEdgeFunction<{ data: DLDTransaction[]; total: number; offset: number; limit: number }>("dld-analytics/transactions", {
      district,
      period: filters?.period,
      propertyType: filters?.propertyType,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      offset,
      limit,
    });
    if (remote) {
      return {
        data: {
          data: remote.data,
          total: remote.total,
          offset: remote.offset,
          limit: remote.limit,
        },
        source: "live",
      };
    }

    await ensureTransactionsReady();
    let txs = getTransactionsByDistrict(district);
    if (filters) {
      txs = applyFilters(txs, { ...filters, district: undefined });
    }
    const sorted = [...txs].sort((a, b) => b.amount - a.amount);
    const safeOffset = Math.max(0, Math.min(offset, sorted.length));
    return {
      data: {
        data: sorted.slice(safeOffset, safeOffset + limit),
        total: sorted.length,
        offset: safeOffset,
        limit,
      },
      source: "demo",
    };
  },

  async getTopTransactions(
    filters?: DLDAnalyticsFilters,
    offset: number = 0,
    limit: number = 20,
  ): Promise<Sourced<PaginatedResult<DLDTransaction>>> {
    const remote = await fetchFromEdgeFunction<DLDTransaction[]>("dld-analytics/top-transactions", {
      limit,
      propertyType: filters?.propertyType,
      district: filters?.district,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      transactionType: filters?.transactionType,
    });
    if (remote) {
      const sorted = [...remote].sort((a, b) => b.amount - a.amount);
      const safeOffset = Math.max(0, Math.min(offset, sorted.length));
      return {
        data: {
          data: sorted.slice(safeOffset, safeOffset + limit),
          total: sorted.length,
          offset: safeOffset,
          limit,
        },
        source: "live",
      };
    }

    const allTxs = await ensureTransactionsReady();
    const txs = filters ? applyFilters(allTxs, filters) : [...allTxs];
    const sorted = txs.sort((a, b) => b.amount - a.amount);
    const safeOffset = Math.max(0, Math.min(offset, sorted.length));
    return {
      data: {
        data: sorted.slice(safeOffset, safeOffset + limit),
        total: sorted.length,
        offset: safeOffset,
        limit,
      },
      source: "demo",
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

  async getAvailableDistricts(): Promise<string[]> {
    const txs = await ensureTransactionsReady();
    return [...new Set(txs.map(t => t.district))].sort();
  },

  async getAvailablePeriods(): Promise<string[]> {
    const txs = await ensureTransactionsReady();
    return [...new Set(txs.map(t => t.transactionDate.slice(0, 7)))].sort();
  },

  async getBuildingHistory(buildingName: string): Promise<Sourced<DLDTransaction[]>> {
    const remote = await fetchFromEdgeFunction<DLDTransaction[]>("dld-analytics/building-history", {
      building: buildingName,
    });
    if (remote) return { data: remote, source: "live" };

    const txs = await ensureTransactionsReady();
    return { data: computeBuildingHistory(txs, buildingName), source: "demo" };
  },

  async getComparableSales(
    district: string,
    propertyType?: string,
    bedrooms?: number,
    limit: number = 20
  ): Promise<Sourced<{ comparables: DLDTransaction[]; medianPricePerSqft: number }>> {
    const remote = await fetchFromEdgeFunction<{ comparables: DLDTransaction[]; medianPricePerSqft: number }>(
      "dld-analytics/comparables",
      { district, type: propertyType, bedrooms, limit }
    );
    if (remote) return { data: remote, source: "live" };

    const txs = await ensureTransactionsReady();
    return { data: computeComparableSales(txs, district, propertyType, bedrooms, limit), source: "demo" };
  },

  async getMarketSummary(): Promise<Sourced<{
    avgPricePerSqft: number;
    totalVolume: number;
    transactionCount: number;
    volumeTrend: number;
    hottestDistrict: string;
  }>> {
    const remote = await fetchFromEdgeFunction<{
      avgPricePerSqft: number;
      totalVolume: number;
      transactionCount: number;
      volumeTrend: number;
      hottestDistrict: string;
    }>("dld-analytics/summary", {});
    if (remote) return { data: remote, source: "live" };

    const txs = await ensureTransactionsReady();
    return { data: computeMarketSummary(txs), source: "demo" };
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

  async getAllBuildings(): Promise<string[]> {
    const txs = await ensureTransactionsReady();
    return [...new Set(txs.filter(t => t.buildingName).map(t => t.buildingName!))].sort();
  },

  async getDistrictBuildings(district: string): Promise<Sourced<{ buildings: { name: string; district: string; avgPricePerSqft: number; transactionCount: number; totalVolume: number }[] }>> {
    const txs = await ensureTransactionsReady();
    const districtTxs = txs.filter(t => t.district === district && t.buildingName);
    const buildingMap = new Map<string, { prices: number[]; amounts: number[] }>();
    for (const tx of districtTxs) {
      const key = tx.buildingName!;
      if (!buildingMap.has(key)) buildingMap.set(key, { prices: [], amounts: [] });
      const entry = buildingMap.get(key)!;
      entry.prices.push(tx.pricePerSqft);
      entry.amounts.push(tx.amount);
    }
    const buildings = [...buildingMap.entries()].map(([name, { prices, amounts }]) => ({
      name,
      district,
      avgPricePerSqft: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      transactionCount: prices.length,
      totalVolume: amounts.reduce((a, b) => a + b, 0),
    })).sort((a, b) => b.transactionCount - a.transactionCount);
    return { data: { buildings }, source: "demo" as const };
  },

  async getBuildingsLive(district?: string): Promise<{ name: string; district: string }[] | null> {
    const remote = await fetchFromEdgeFunction<{ name: string; district: string }[]>(
      "dld-analytics/buildings",
      { district }
    );
    return remote;
  },
};
