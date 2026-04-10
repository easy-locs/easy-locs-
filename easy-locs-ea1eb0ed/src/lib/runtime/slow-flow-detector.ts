/**
 * slow-flow-detector — Atomic unit: detect and report slow execution flows.
 * Single responsibility: latency threshold monitoring.
 */
import { reportAnomaly } from "./anomaly-detector";

export interface SlowFlowConfig {
  warningMs: number;
  criticalMs: number;
}

const DEFAULT_THRESHOLDS: Record<string, SlowFlowConfig> = {
  wallet: { warningMs: 2000, criticalMs: 5000 },
  orbit: { warningMs: 1500, criticalMs: 4000 },
  orders: { warningMs: 3000, criticalMs: 8000 },
  dashboard: { warningMs: 2000, criticalMs: 6000 },
  radar: { warningMs: 1000, criticalMs: 3000 },
  delivery: { warningMs: 2000, criticalMs: 5000 },
  default: { warningMs: 2000, criticalMs: 5000 },
};

const recentFlows: Array<{ domain: string; operation: string; latencyMs: number; at: string }> = [];
const MAX_HISTORY = 100;

export function checkSlowFlow(domain: string, operation: string, latencyMs: number) {
  const thresholds = DEFAULT_THRESHOLDS[domain] ?? DEFAULT_THRESHOLDS.default;

  recentFlows.push({ domain, operation, latencyMs, at: new Date().toISOString() });
  if (recentFlows.length > MAX_HISTORY) recentFlows.shift();

  if (latencyMs >= thresholds.criticalMs) {
    reportAnomaly("slow_flow", domain, `Critically slow: ${operation} took ${latencyMs}ms`, "critical", {
      operation, latencyMs, threshold: thresholds.criticalMs,
    });
    return "critical";
  }
  if (latencyMs >= thresholds.warningMs) {
    reportAnomaly("slow_flow", domain, `Slow flow: ${operation} took ${latencyMs}ms`, "medium", {
      operation, latencyMs, threshold: thresholds.warningMs,
    });
    return "warning";
  }
  return "ok";
}

export function getSlowFlowHistory() {
  return [...recentFlows];
}

export function getP95Latency(domain?: string): number {
  const flows = domain ? recentFlows.filter(f => f.domain === domain) : recentFlows;
  if (!flows.length) return 0;
  const sorted = flows.map(f => f.latencyMs).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
}
