import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/services/db";
import { supabase } from "@/integrations/supabase/client";
import type { MapErrorType } from "@/lib/analytics/map-error-analytics";

export type DashboardTimeRange = "1h" | "6h" | "24h" | "7d";
export type AutoRefreshInterval = "off" | "30s" | "1m" | "5m";

export interface ErrorBucket {
  time: string;
  count: number;
  rate: number;
  token: number;
  webgl: number;
  network: number;
  init_failure: number;
  runtime: number;
  unknown: number;
}

export interface AlertLogEntry {
  id: string;
  alert_type: string;
  threshold: number;
  actual_count: number;
  window_minutes: number;
  details: Record<string, unknown>;
  created_at: string;
}

interface RawRow {
  error_type: string;
  component: string;
  created_at: string;
}

const ERROR_TYPE_KEYS: MapErrorType[] = ["token", "webgl", "network", "init_failure", "runtime", "unknown"];

function intervalToMs(interval: AutoRefreshInterval): number | null {
  switch (interval) {
    case "off": return null;
    case "30s": return 30_000;
    case "1m": return 60_000;
    case "5m": return 300_000;
  }
}

function rangeToMinutes(range: DashboardTimeRange): number {
  switch (range) {
    case "1h": return 60;
    case "6h": return 360;
    case "24h": return 1440;
    case "7d": return 10080;
  }
}

function bucketMinutes(range: DashboardTimeRange): number {
  switch (range) {
    case "1h": return 1;
    case "6h": return 5;
    case "24h": return 15;
    case "7d": return 60;
  }
}

function formatBucketLabel(date: Date, range: DashboardTimeRange): string {
  if (range === "7d") {
    return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function bucketize(rows: RawRow[], range: DashboardTimeRange): ErrorBucket[] {
  const totalMinutes = rangeToMinutes(range);
  const bm = bucketMinutes(range);
  const now = Date.now();
  const start = now - totalMinutes * 60_000;
  const count = Math.ceil(totalMinutes / bm);

  const buckets: ErrorBucket[] = Array.from({ length: count }, (_, i) => {
    const t = new Date(start + i * bm * 60_000);
    return {
      time: formatBucketLabel(t, range),
      count: 0, rate: 0, token: 0, webgl: 0, network: 0, init_failure: 0, runtime: 0, unknown: 0,
    };
  });

  for (const row of rows) {
    const ts = new Date(row.created_at).getTime();
    if (ts < start) continue;
    const idx = Math.min(Math.floor((ts - start) / (bm * 60_000)), count - 1);
    buckets[idx].count++;
    const et = row.error_type as MapErrorType;
    if (ERROR_TYPE_KEYS.includes(et)) {
      (buckets[idx] as unknown as Record<string, number>)[et]++;
    }
  }

  for (const b of buckets) {
    b.rate = +(b.count / bm).toFixed(2);
  }

  return buckets;
}

export function useMapErrorDashboard() {
  const [range, setRange] = useState<DashboardTimeRange>("24h");
  const [errorType, setErrorType] = useState<string>("all");
  const [component, setComponent] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshInterval>("off");
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const [buckets, setBuckets] = useState<ErrorBucket[]>([]);
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([]);
  const [totalErrors, setTotalErrors] = useState(0);
  const [components, setComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const since = new Date(Date.now() - rangeToMinutes(range) * 60_000).toISOString();

      let errorQuery = db
        .from("map_error_analytics")
        .select("error_type, component, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000);

      if (errorType !== "all") {
        errorQuery = errorQuery.eq("error_type", errorType);
      }
      if (component !== "all") {
        errorQuery = errorQuery.eq("component", component);
      }

      let alertQuery = db
        .from("map_error_alert_log")
        .select("id, alert_type, threshold, actual_count, window_minutes, details, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);

      if (errorType !== "all") {
        alertQuery = alertQuery.eq("details->>error_type", errorType);
      }
      if (component !== "all") {
        alertQuery = alertQuery.eq("details->>component", component);
      }

      const compQuery = db
        .from("map_error_analytics")
        .select("component")
        .gte("created_at", since)
        .limit(1000);

      const [errorResult, alertResult, compResult] = await Promise.all([
        errorQuery, alertQuery, compQuery,
      ]);

      if (errorResult.error) throw new Error(errorResult.error.message);
      if (alertResult.error) throw new Error(alertResult.error.message);
      if (compResult.error) throw new Error(compResult.error.message);

      const rows: RawRow[] = errorResult.data ?? [];
      setBuckets(bucketize(rows, range));
      setTotalErrors(rows.length);
      setAlerts(alertResult.data ?? []);

      const compSet = new Set<string>();
      for (const r of (compResult.data ?? []) as { component: string }[]) {
        if (r.component) compSet.add(r.component);
      }
      setComponents(Array.from(compSet).sort());
      setLastRefreshTime(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load map error data");
    } finally {
      setLoading(false);
    }
  }, [range, errorType, component]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    const ms = intervalToMs(autoRefresh);
    if (!ms) {
      setSecondsUntilRefresh(null);
      return;
    }

    let remaining = Math.ceil(ms / 1000);
    setSecondsUntilRefresh(remaining);

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining < 0) remaining = Math.ceil(ms / 1000);
      setSecondsUntilRefresh(remaining);
    }, 1000);

    intervalRef.current = setInterval(() => {
      remaining = Math.ceil(ms / 1000);
      setSecondsUntilRefresh(remaining);
      fetchData();
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, fetchData]);

  useEffect(() => {
    if (!realtimeEnabled) {
      setRealtimeConnected(false);
      return;
    }

    const channel = supabase
      .channel("map-error-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "map_error_analytics",
        },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "map_error_alert_log",
        },
        () => {
          fetchData();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [realtimeEnabled, fetchData]);

  return {
    range, setRange,
    errorType, setErrorType,
    component, setComponent,
    autoRefresh, setAutoRefresh,
    realtimeEnabled, setRealtimeEnabled,
    realtimeConnected,
    lastRefreshTime,
    secondsUntilRefresh,
    buckets, alerts, totalErrors, components,
    loading, error, refetch: fetchData,
  };
}
