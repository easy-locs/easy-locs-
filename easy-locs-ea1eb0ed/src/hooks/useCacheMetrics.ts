import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CacheMetricsSnapshot {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  stores: number;
  hitRate: number;
  currentSize: number;
  averageSize: number;
  maxSize: number;
  ttlMs: number;
  uptimeMs: number;
}

export interface CacheMetricsState {
  metrics: CacheMetricsSnapshot | null;
  previousMetrics: CacheMetricsSnapshot | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  refresh: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CACHE_METRICS_KEY = import.meta.env.VITE_CACHE_METRICS_KEY as string | undefined;

const POLL_INTERVAL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

export function useCacheMetrics(): CacheMetricsState {
  const [metrics, setMetrics] = useState<CacheMetricsSnapshot | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<CacheMetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!SUPABASE_URL) {
      setError("Supabase URL not configured");
      setLoading(false);
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const url = `${SUPABASE_URL}/functions/v1/extract-article/metrics`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (CACHE_METRICS_KEY) {
        headers["X-Metrics-Key"] = CACHE_METRICS_KEY;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (
        typeof data.hits !== "number" ||
        typeof data.misses !== "number" ||
        typeof data.hitRate !== "number"
      ) {
        throw new Error("Invalid metrics response format");
      }

      const snapshot: CacheMetricsSnapshot = {
        hits: data.hits,
        misses: data.misses,
        evictions: data.evictions ?? 0,
        expirations: data.expirations ?? 0,
        stores: data.stores ?? 0,
        hitRate: data.hitRate,
        currentSize: data.currentSize ?? 0,
        averageSize: data.averageSize ?? 0,
        maxSize: data.maxSize ?? 0,
        ttlMs: data.ttlMs ?? 0,
        uptimeMs: data.uptimeMs ?? 0,
      };

      setMetrics((prev) => {
        if (prev) setPreviousMetrics(prev);
        return snapshot;
      });
      setError(null);
      setLastFetchedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMetrics]);

  return { metrics, previousMetrics, loading, error, lastFetchedAt, refresh: fetchMetrics };
}
