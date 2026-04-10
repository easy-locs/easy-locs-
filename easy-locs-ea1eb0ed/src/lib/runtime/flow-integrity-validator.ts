/**
 * flow-integrity-validator — Detects broken end-to-end flows automatically.
 * Checks: UI trigger → validation → state → DB → event → realtime → cache → UI refresh.
 * Lightweight observer — no business logic duplication.
 */

import { getTraces, type FlowTrace, subscribeTraces } from "./flow-tracer";
import { reportAnomaly } from "./anomaly-detector";
import { getAllEventRecords } from "./event-audit";
import { checkStaleness } from "./realtime-monitor";
import { getStaleEntries } from "./cache-validator";
import { getAllHealth } from "./health-aggregator";

export type FlowIntegrityIssue = {
  id: string;
  flowId: string;
  flowName: string;
  domain: string;
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  suggestion: string;
};

const MAX_ISSUES = 200;
let issues: FlowIntegrityIssue[] = [];
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

function uid() {
  return `fi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addIssue(partial: Omit<FlowIntegrityIssue, "id" | "detectedAt">) {
  const issue: FlowIntegrityIssue = {
    ...partial,
    id: uid(),
    detectedAt: new Date().toISOString(),
  };
  issues = [issue, ...issues].slice(0, MAX_ISSUES);
  notify();
  return issue;
}

/**
 * Validate a completed flow for end-to-end integrity.
 */
export function validateFlowIntegrity(trace: FlowTrace): FlowIntegrityIssue[] {
  const found: FlowIntegrityIssue[] = [];

  // 1. Flow completed but no steps recorded → suspicious
  if (trace.status === "success" && trace.steps.length === 0) {
    found.push(addIssue({
      flowId: trace.flowId, flowName: trace.flowName, domain: trace.domain,
      issue: "empty_success_flow",
      severity: "medium",
      suggestion: "Flow completed with no steps — may be missing instrumentation.",
    }));
  }

  // 2. Flow has DB step success but no event emission step
  const hasDbStep = trace.steps.some(s => s.name.includes("db") && s.status === "success");
  const hasEventStep = trace.steps.some(s =>
    (s.name.includes("event") || s.name.includes("emit") || s.name.includes("bus")) && s.status === "success"
  );
  if (hasDbStep && !hasEventStep && trace.status === "success") {
    found.push(addIssue({
      flowId: trace.flowId, flowName: trace.flowName, domain: trace.domain,
      issue: "db_write_without_event",
      severity: "high",
      suggestion: "DB write succeeded but no event was emitted — downstream consumers may not refresh.",
    }));
  }

  // 3. Flow too slow (> 5s)
  if (trace.totalLatencyMs && trace.totalLatencyMs > 5000) {
    found.push(addIssue({
      flowId: trace.flowId, flowName: trace.flowName, domain: trace.domain,
      issue: "slow_flow",
      severity: trace.totalLatencyMs > 10000 ? "high" : "medium",
      suggestion: `Flow took ${trace.totalLatencyMs}ms — consider parallelizing steps or adding caching.`,
    }));
  }

  // 4. Flow failed with retries
  if (trace.status === "failed" && trace.retryCount > 0) {
    found.push(addIssue({
      flowId: trace.flowId, flowName: trace.flowName, domain: trace.domain,
      issue: "failed_after_retries",
      severity: trace.retryCount >= 3 ? "critical" : "high",
      suggestion: `Flow failed after ${trace.retryCount} retries — check for persistent errors.`,
    }));
  }

  // 5. Individual step took too long (> 3s)
  for (const step of trace.steps) {
    if (step.latencyMs && step.latencyMs > 3000) {
      found.push(addIssue({
        flowId: trace.flowId, flowName: trace.flowName, domain: trace.domain,
        issue: "slow_step",
        severity: step.latencyMs > 8000 ? "high" : "medium",
        suggestion: `Step "${step.name}" took ${step.latencyMs}ms — bottleneck candidate.`,
      }));
    }
  }

  return found;
}

/**
 * Run a full system-wide integrity scan.
 * Call periodically (e.g. every 30s) to detect cross-domain issues.
 */
export function runSystemIntegrityScan(): {
  flowIssues: number;
  eventIssues: number;
  realtimeIssues: number;
  cacheIssues: number;
  healthIssues: number;
} {
  const result = { flowIssues: 0, eventIssues: 0, realtimeIssues: 0, cacheIssues: 0, healthIssues: 0 };

  // Scan recent completed flows
  const traces = getTraces();
  const recentCompleted = traces.filter(t =>
    (t.status === "success" || t.status === "failed") &&
    t.endedAt && (Date.now() - t.endedAt) < 60_000
  );
  for (const trace of recentCompleted) {
    result.flowIssues += validateFlowIntegrity(trace).length;
  }

  // Dead events (emitted but never consumed)
  const deadEvents = getAllEventRecords().filter(r => r.emittedCount > 0 && r.consumedCount === 0);
  if (deadEvents.length > 5) {
    reportAnomaly("dead_event", "system", `${deadEvents.length} events emitted but never consumed`, "medium", {
      events: deadEvents.slice(0, 10).map(e => e.event),
    });
    result.eventIssues = deadEvents.length;
  }

  // Stale realtime channels
  const staleChannels = checkStaleness();
  if (staleChannels.length > 0) {
    reportAnomaly("realtime_stale", "realtime", `${staleChannels.length} channels stale or dead`, "medium", {
      channels: staleChannels.map(c => c.channelName),
    });
    result.realtimeIssues = staleChannels.length;
  }

  // Stale cache entries
  const staleCache = getStaleEntries();
  if (staleCache.length > 3) {
    reportAnomaly("stale_cache", "cache", `${staleCache.length} cache entries expired`, "low", {
      keys: staleCache.map(c => c.key),
    });
    result.cacheIssues = staleCache.length;
  }

  // Module health degradation
  const unhealthy = getAllHealth().filter(m => m.status === "degraded" || m.status === "down");
  if (unhealthy.length > 0) {
    result.healthIssues = unhealthy.length;
  }

  return result;
}

/** Auto-validate every completed flow. */
let autoValidateActive = false;

export function startAutoValidation() {
  if (autoValidateActive) return () => {};
  autoValidateActive = true;

  let lastCheckedIndex = 0;
  const unsub = subscribeTraces(() => {
    const traces = getTraces();
    for (let i = lastCheckedIndex; i < traces.length; i++) {
      const t = traces[i];
      if (t.status === "success" || t.status === "failed") {
        validateFlowIntegrity(t);
      }
    }
    lastCheckedIndex = traces.length;
  });

  return () => {
    autoValidateActive = false;
    unsub();
  };
}

export function getFlowIssues(): FlowIntegrityIssue[] { return [...issues]; }
export function clearFlowIssues() { issues = []; notify(); }
export function subscribeFlowIntegrity(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
