import { useState, useEffect, useCallback, useMemo } from "react";
import { structuredLogger, type StructuredLogEntry } from "@/lib/observability/structured-logger";
import { onEvent, type AnalyticsEvent } from "@/lib/analytics/event-bus";
import type { MapErrorType } from "@/lib/analytics/map-error-analytics";

export type TimeRange = "7d" | "30d";

export interface MapErrorSummary {
  total: number;
  byType: Record<MapErrorType, number>;
  byComponent: Record<string, number>;
  trend: { date: string; count: number }[];
  recentErrors: Array<{
    timestamp: string;
    type: MapErrorType;
    component: string;
    message: string;
  }>;
}

const ERROR_TYPES: MapErrorType[] = ["token", "webgl", "network", "init_failure", "runtime", "unknown"];

function buildEmptyByType(): Record<MapErrorType, number> {
  return { token: 0, webgl: 0, network: 0, init_failure: 0, runtime: 0, unknown: 0 };
}

function getDayKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function generateDateRange(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

function getMapErrorLogs(): readonly StructuredLogEntry[] {
  return structuredLogger.getErrorsByDomain("maps");
}

function aggregateLogs(
  logs: readonly StructuredLogEntry[],
  days: number,
  typeFilter: MapErrorType | null,
  componentFilter: string | null,
): MapErrorSummary {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffStr = cutoff.toISOString();

  const dateRange = generateDateRange(days);
  const trendMap: Record<string, number> = {};
  for (const d of dateRange) trendMap[d] = 0;

  const byType = buildEmptyByType();
  const byComponent: Record<string, number> = {};
  const recentErrors: MapErrorSummary["recentErrors"] = [];

  for (const entry of logs) {
    if (entry.timestamp < cutoffStr) continue;

    const entryType = (entry.error_classification || entry.payload_summary?.error_type || "unknown") as MapErrorType;
    const entryComponent = (entry.payload_summary?.component as string) || "unknown";

    if (typeFilter && entryType !== typeFilter) continue;
    if (componentFilter && entryComponent !== componentFilter) continue;

    const normalizedType = ERROR_TYPES.includes(entryType) ? entryType : "unknown";
    byType[normalizedType]++;

    byComponent[entryComponent] = (byComponent[entryComponent] || 0) + 1;

    const dayKey = getDayKey(entry.timestamp);
    if (dayKey in trendMap) trendMap[dayKey]++;

    recentErrors.push({
      timestamp: entry.timestamp,
      type: normalizedType,
      component: entryComponent,
      message: entry.message,
    });
  }

  const trend = dateRange.map((date) => ({ date, count: trendMap[date] || 0 }));
  const total = recentErrors.length;

  return {
    total,
    byType,
    byComponent,
    trend,
    recentErrors: recentErrors.slice(-20).reverse(),
  };
}

export function useMapErrorAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [typeFilter, setTypeFilter] = useState<MapErrorType | null>(null);
  const [componentFilter, setComponentFilter] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = onEvent((event: AnalyticsEvent) => {
      if (event.type === "map.load_failure") {
        setTick((t) => t + 1);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(interval);
  }, []);

  const logs = useMemo(() => getMapErrorLogs(), [tick]);

  const days = timeRange === "7d" ? 7 : 30;

  const summary = useMemo(
    () => aggregateLogs(logs, days, typeFilter, componentFilter),
    [logs, days, typeFilter, componentFilter],
  );

  const availableComponents = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    const cutoffStr = cutoff.toISOString();

    const comps = new Set<string>();
    for (const entry of logs) {
      if (entry.timestamp < cutoffStr) continue;
      const c = entry.payload_summary?.component as string;
      if (c) comps.add(c);
    }
    return Array.from(comps).sort();
  }, [logs, days]);

  const clearFilters = useCallback(() => {
    setTypeFilter(null);
    setComponentFilter(null);
  }, []);

  return {
    summary,
    timeRange,
    setTimeRange,
    typeFilter,
    setTypeFilter,
    componentFilter,
    setComponentFilter,
    availableComponents,
    clearFilters,
  };
}
