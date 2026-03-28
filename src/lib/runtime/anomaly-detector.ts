/**
 * anomaly-detector — Atomic runtime unit: detects runtime anomalies.
 * Single responsibility: pattern detection for stale cache, event mismatches, slow flows.
 */

export type AnomalyType =
  | "stale_cache"
  | "event_mismatch"
  | "slow_flow"
  | "retry_storm"
  | "realtime_stale"
  | "schema_conflict"
  | "duplicate_path"
  | "dead_event";

export interface Anomaly {
  id: string;
  type: AnomalyType;
  module: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  detectedAt: string;
  context?: Record<string, unknown>;
  resolved: boolean;
}

const MAX_ANOMALIES = 300;
let anomalies: Anomaly[] = [];
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

function uid() {
  return `an_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function reportAnomaly(
  type: AnomalyType,
  module: string,
  message: string,
  severity: Anomaly["severity"] = "medium",
  context?: Record<string, unknown>
): Anomaly {
  const anomaly: Anomaly = {
    id: uid(), type, module, severity, message,
    detectedAt: new Date().toISOString(),
    context, resolved: false,
  };
  anomalies = [anomaly, ...anomalies].slice(0, MAX_ANOMALIES);

  const logger = severity === "critical" || severity === "high" ? console.error : console.warn;
  logger(`[ANOMALY][${type}][${module}] ${message}`, context ?? {});
  notify();
  return anomaly;
}

export function resolveAnomaly(id: string) {
  const a = anomalies.find(x => x.id === id);
  if (a) { a.resolved = true; notify(); }
}

export function getAnomalies(opts?: { unresolved?: boolean; type?: AnomalyType; module?: string }): Anomaly[] {
  let result = [...anomalies];
  if (opts?.unresolved) result = result.filter(a => !a.resolved);
  if (opts?.type) result = result.filter(a => a.type === opts.type);
  if (opts?.module) result = result.filter(a => a.module === opts.module);
  return result;
}

export function clearAnomalies() { anomalies = []; notify(); }

export function subscribeAnomalies(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Detection helpers ──

export function detectSlowFlow(module: string, flowName: string, latencyMs: number, thresholdMs = 3000) {
  if (latencyMs > thresholdMs) {
    reportAnomaly("slow_flow", module, `${flowName} took ${latencyMs}ms (threshold: ${thresholdMs}ms)`, 
      latencyMs > thresholdMs * 3 ? "high" : "medium",
      { flowName, latencyMs, thresholdMs });
  }
}

export function detectRetryStorm(module: string, flowName: string, retryCount: number, threshold = 3) {
  if (retryCount >= threshold) {
    reportAnomaly("retry_storm", module, `${flowName} retried ${retryCount} times`,
      retryCount >= threshold * 2 ? "critical" : "high",
      { flowName, retryCount, threshold });
  }
}

export function detectStaleRealtime(module: string, channel: string, lastUpdateAge: number, thresholdMs = 30000) {
  if (lastUpdateAge > thresholdMs) {
    reportAnomaly("realtime_stale", module, `Channel ${channel} stale for ${Math.round(lastUpdateAge / 1000)}s`,
      lastUpdateAge > thresholdMs * 3 ? "high" : "medium",
      { channel, lastUpdateAge, thresholdMs });
  }
}
