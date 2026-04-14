import { platformBus } from "@/lib/shared/platform-bus";
import { structuredLogger } from "@/lib/observability/structured-logger";

export interface AnomalyThresholds {
  errorVelocityPerMinute: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  retryStormCount: number;
  queueBacklogDepth: number;
  mutationRejectionRate: number;
  reconnectFrequency: number;
  invalidTransitionCount: number;
  staleDataFrequency: number;
}

export interface DomainMetricsWindow {
  domain: string;
  windowStartMs: number;
  windowEndMs: number;
  errors: number;
  successes: number;
  latencies: number[];
  retryCount: number;
  queueBacklog: number;
  mutationRejections: number;
  mutationAttempts: number;
  reconnects: number;
  invalidTransitions: number;
  staleDataHits: number;
}

export interface AnomalyEvent {
  domain: string;
  metric: string;
  currentValue: number;
  threshold: number;
  actionTaken: string;
  timestamp: number;
}

export type PreemptiveAction =
  | "pre_throttle"
  | "degrade_mode"
  | "freeze_writes"
  | "quarantine_engine"
  | "suppress_retries"
  | "disable_feature"
  | "isolate_release";

const WINDOW_DURATION_MS = 60_000;
const MAX_WINDOWS_PER_DOMAIN = 30;
const MAX_ANOMALY_EVENTS = 200;

const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  errorVelocityPerMinute: 50,
  p95LatencyMs: 2000,
  p99LatencyMs: 5000,
  retryStormCount: 100,
  queueBacklogDepth: 1000,
  mutationRejectionRate: 0.3,
  reconnectFrequency: 20,
  invalidTransitionCount: 10,
  staleDataFrequency: 50,
};

const domainThresholds = new Map<string, AnomalyThresholds>();
const activeWindows = new Map<string, DomainMetricsWindow[]>();
const anomalyEvents: AnomalyEvent[] = [];
const actionCallbacks = new Map<PreemptiveAction, (domain: string, metric: string, value: number) => void>();

export function setDomainThresholds(domain: string, thresholds: Partial<AnomalyThresholds>): void {
  const current = domainThresholds.get(domain) ?? { ...DEFAULT_THRESHOLDS };
  domainThresholds.set(domain, { ...current, ...thresholds });
}

export function getThresholds(domain: string): AnomalyThresholds {
  return domainThresholds.get(domain) ?? DEFAULT_THRESHOLDS;
}

export function registerPreemptiveAction(
  action: PreemptiveAction,
  callback: (domain: string, metric: string, value: number) => void,
): void {
  actionCallbacks.set(action, callback);
}

function getCurrentWindow(domain: string): DomainMetricsWindow {
  let windows = activeWindows.get(domain);
  if (!windows) {
    windows = [];
    activeWindows.set(domain, windows);
  }

  const now = Date.now();
  let current = windows[windows.length - 1];

  if (!current || now >= current.windowEndMs) {
    current = {
      domain,
      windowStartMs: now,
      windowEndMs: now + WINDOW_DURATION_MS,
      errors: 0,
      successes: 0,
      latencies: [],
      retryCount: 0,
      queueBacklog: 0,
      mutationRejections: 0,
      mutationAttempts: 0,
      reconnects: 0,
      invalidTransitions: 0,
      staleDataHits: 0,
    };
    windows.push(current);

    if (windows.length > MAX_WINDOWS_PER_DOMAIN) {
      windows.splice(0, windows.length - MAX_WINDOWS_PER_DOMAIN);
    }
  }

  return current;
}

export function recordError(domain: string): void {
  getCurrentWindow(domain).errors++;
  checkThresholds(domain);
}

export function recordSuccess(domain: string): void {
  getCurrentWindow(domain).successes++;
}

export function recordLatency(domain: string, latencyMs: number): void {
  const window = getCurrentWindow(domain);
  window.latencies.push(latencyMs);
  if (window.latencies.length > 1000) {
    window.latencies.splice(0, window.latencies.length - 1000);
  }
  checkThresholds(domain);
}

export function recordRetry(domain: string): void {
  getCurrentWindow(domain).retryCount++;
  checkThresholds(domain);
}

export function recordQueueBacklog(domain: string, depth: number): void {
  getCurrentWindow(domain).queueBacklog = depth;
  checkThresholds(domain);
}

export function recordMutationAttempt(domain: string, rejected: boolean): void {
  const window = getCurrentWindow(domain);
  window.mutationAttempts++;
  if (rejected) window.mutationRejections++;
  checkThresholds(domain);
}

export function recordReconnect(domain: string): void {
  getCurrentWindow(domain).reconnects++;
  checkThresholds(domain);
}

export function recordInvalidTransition(domain: string): void {
  getCurrentWindow(domain).invalidTransitions++;
  checkThresholds(domain);
}

export function recordStaleData(domain: string): void {
  getCurrentWindow(domain).staleDataHits++;
  checkThresholds(domain);
}

function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function checkThresholds(domain: string): void {
  const window = getCurrentWindow(domain);
  const thresholds = getThresholds(domain);
  const windowDurationMinutes = (Date.now() - window.windowStartMs) / 60_000;
  if (windowDurationMinutes < 0.1) return;

  const errorVelocity = window.errors / Math.max(windowDurationMinutes, 0.1);
  if (errorVelocity > thresholds.errorVelocityPerMinute) {
    triggerAction(domain, "errorVelocity", errorVelocity, thresholds.errorVelocityPerMinute, "pre_throttle");
  }

  const p95 = computePercentile(window.latencies, 95);
  if (p95 > thresholds.p95LatencyMs) {
    triggerAction(domain, "p95Latency", p95, thresholds.p95LatencyMs, "degrade_mode");
  }

  const p99 = computePercentile(window.latencies, 99);
  if (p99 > thresholds.p99LatencyMs) {
    triggerAction(domain, "p99Latency", p99, thresholds.p99LatencyMs, "degrade_mode");
  }

  if (window.retryCount > thresholds.retryStormCount) {
    triggerAction(domain, "retryStorm", window.retryCount, thresholds.retryStormCount, "suppress_retries");
  }

  if (window.queueBacklog > thresholds.queueBacklogDepth) {
    triggerAction(domain, "queueBacklog", window.queueBacklog, thresholds.queueBacklogDepth, "pre_throttle");
  }

  const rejectionRate = window.mutationAttempts > 0
    ? window.mutationRejections / window.mutationAttempts
    : 0;
  if (rejectionRate > thresholds.mutationRejectionRate && window.mutationAttempts > 10) {
    triggerAction(domain, "mutationRejectionRate", rejectionRate, thresholds.mutationRejectionRate, "freeze_writes");
  }

  if (window.reconnects > thresholds.reconnectFrequency) {
    triggerAction(domain, "reconnectFrequency", window.reconnects, thresholds.reconnectFrequency, "degrade_mode");
  }

  if (window.invalidTransitions > thresholds.invalidTransitionCount) {
    triggerAction(domain, "invalidTransitions", window.invalidTransitions, thresholds.invalidTransitionCount, "quarantine_engine");
  }

  if (window.staleDataHits > thresholds.staleDataFrequency) {
    triggerAction(domain, "staleDataFrequency", window.staleDataHits, thresholds.staleDataFrequency, "degrade_mode");
  }
}

function triggerAction(
  domain: string,
  metric: string,
  value: number,
  threshold: number,
  action: PreemptiveAction,
): void {
  const recentSameAction = anomalyEvents.find(
    e => e.domain === domain && e.metric === metric && (Date.now() - e.timestamp) < 30_000,
  );
  if (recentSameAction) return;

  const event: AnomalyEvent = {
    domain,
    metric,
    currentValue: value,
    threshold,
    actionTaken: action,
    timestamp: Date.now(),
  };
  anomalyEvents.push(event);
  if (anomalyEvents.length > MAX_ANOMALY_EVENTS) anomalyEvents.shift();

  structuredLogger.warn(
    "system",
    "anomaly_detected",
    `[${domain}] ${metric}=${value.toFixed(2)} exceeds threshold=${threshold} → action=${action}`,
  );

  platformBus.emit("anomaly:detected", event, "system");

  const callback = actionCallbacks.get(action);
  if (callback) {
    try {
      callback(domain, metric, value);
    } catch (err: any) {
      structuredLogger.error("system", "anomaly_action_failed", err?.message ?? String(err));
    }
  }
}

export function getAnomalyEvents(domain?: string, limit = 50): AnomalyEvent[] {
  const filtered = domain ? anomalyEvents.filter(e => e.domain === domain) : anomalyEvents;
  return filtered.slice(-limit);
}

export function getDomainMetrics(domain: string): DomainMetricsWindow | undefined {
  const windows = activeWindows.get(domain);
  return windows?.[windows.length - 1];
}

export function getAllDomainMetrics(): Record<string, {
  errorVelocity: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  retryCount: number;
  queueBacklog: number;
  rejectionRate: number;
  reconnects: number;
  invalidTransitions: number;
}> {
  const result: Record<string, any> = {};

  for (const [domain, windows] of activeWindows) {
    const current = windows[windows.length - 1];
    if (!current) continue;

    const windowDurationMinutes = Math.max((Date.now() - current.windowStartMs) / 60_000, 0.1);

    result[domain] = {
      errorVelocity: Math.round(current.errors / windowDurationMinutes),
      p95LatencyMs: computePercentile(current.latencies, 95),
      p99LatencyMs: computePercentile(current.latencies, 99),
      retryCount: current.retryCount,
      queueBacklog: current.queueBacklog,
      rejectionRate: current.mutationAttempts > 0
        ? Math.round((current.mutationRejections / current.mutationAttempts) * 1000) / 1000
        : 0,
      reconnects: current.reconnects,
      invalidTransitions: current.invalidTransitions,
    };
  }

  return result;
}

export function resetAnomalyDetection(): void {
  activeWindows.clear();
  anomalyEvents.length = 0;
}
