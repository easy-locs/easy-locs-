import { structuredLogger } from "@/lib/observability/structured-logger";
import { sentinelTelemetryEngine } from "../telemetry/sentinel-telemetry-engine";
import { getRecentErrorBuffer } from "@/lib/analytics/map-error-analytics";
import { evaluateAlertThresholds } from "@/lib/analytics/map-error-alerting";
import { getOmegaBusBridgeStats } from "@/core/omega/knowledge-graph/omega-bus-bridge";

export interface ApplicationMetrics {
  errorRate: number;
  mapErrorCount: number;
  memoryUsageMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  uptimeMs: number;
  busEventCount: number;
  activeAlerts: number;
  latencyMs: number;
}

let lastCollectionAt = 0;
const COLLECTION_INTERVAL_MS = 30_000;

export function collectApplicationMetrics(): ApplicationMetrics {
  const now = Date.now();
  lastCollectionAt = now;

  const errorBuffer = getRecentErrorBuffer();
  const fiveMinAgo = now - 5 * 60_000;
  const recentErrors = errorBuffer.filter((e) => e.timestamp > fiveMinAgo);
  const errorRate = recentErrors.length / 5;

  let memoryUsageMB = 0;
  let heapUsedMB = 0;
  let heapTotalMB = 0;
  if (typeof performance !== "undefined" && "memory" in performance) {
    interface ChromePerformanceMemory {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    }
    const mem = (performance as unknown as { memory?: ChromePerformanceMemory }).memory;
    if (mem) {
      memoryUsageMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      heapUsedMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      heapTotalMB = Math.round(mem.totalJSHeapSize / (1024 * 1024));
    }
  }

  const busStats = getOmegaBusBridgeStats();
  const busEventCount = busStats.eventCount;

  const alertResults = evaluateAlertThresholds();
  const activeAlerts = alertResults.filter((r) => r.triggered).length;

  let latencyMs = 0;
  if (typeof performance !== "undefined" && performance.getEntriesByType) {
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      latencyMs = Math.round(nav.responseStart - nav.requestStart);
    }
  }

  const metrics: ApplicationMetrics = {
    errorRate,
    mapErrorCount: recentErrors.length,
    memoryUsageMB,
    heapUsedMB,
    heapTotalMB,
    uptimeMs: typeof performance !== "undefined" ? performance.now() : 0,
    busEventCount,
    activeAlerts,
    latencyMs,
  };

  sentinelTelemetryEngine.gauge("app.error_rate", metrics.errorRate);
  sentinelTelemetryEngine.gauge("app.map_errors_5m", metrics.mapErrorCount);
  sentinelTelemetryEngine.gauge("app.memory_mb", metrics.memoryUsageMB);
  sentinelTelemetryEngine.gauge("app.heap_used_mb", metrics.heapUsedMB);
  sentinelTelemetryEngine.gauge("app.active_alerts", metrics.activeAlerts);
  sentinelTelemetryEngine.gauge("app.latency_ms", metrics.latencyMs);

  if (metrics.activeAlerts > 0) {
    sentinelTelemetryEngine.emit("sentinel:alert_active", "metrics-collector", {
      active_alerts: metrics.activeAlerts,
      error_rate: metrics.errorRate,
    });
  }

  return metrics;
}

export function getLastCollectionTime(): number {
  return lastCollectionAt;
}
