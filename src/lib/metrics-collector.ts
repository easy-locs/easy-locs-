/**
 * Metrics Collector — PASS55 Block AS
 * 
 * Complements analytics-engine.ts with:
 * 1. Typed metric counters & gauges
 * 2. Histogram (percentile computation)
 * 3. Rate computation (events/sec)
 * 4. Dashboard-ready metric snapshots
 * 5. SLA/threshold monitoring with alerts
 */

/* ═══════════════════════════════════════════════════
   1. METRIC TYPES
   ═══════════════════════════════════════════════════ */

export type MetricType = "counter" | "gauge" | "histogram";

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  tags?: Record<string, string>;
}

interface CounterState {
  value: number;
  lastIncrementAt: number;
}

interface GaugeState {
  value: number;
  min: number;
  max: number;
  lastSetAt: number;
}

interface HistogramState {
  values: number[];
  sum: number;
  count: number;
  min: number;
  max: number;
}

const counters = new Map<string, CounterState>();
const gauges = new Map<string, GaugeState>();
const histograms = new Map<string, HistogramState>();

/* ═══════════════════════════════════════════════════
   2. COUNTER — Monotonically increasing values
   ═══════════════════════════════════════════════════ */

/** Increment a counter by a given amount */
export function incrementCounter(name: string, amount = 1): number {
  const state = counters.get(name) || { value: 0, lastIncrementAt: 0 };
  state.value += amount;
  state.lastIncrementAt = Date.now();
  counters.set(name, state);
  checkThresholds(name, state.value);
  return state.value;
}

/** Get current counter value */
export function getCounter(name: string): number {
  return counters.get(name)?.value ?? 0;
}

/** Reset a counter to zero */
export function resetCounter(name: string): void {
  counters.delete(name);
}

/* ═══════════════════════════════════════════════════
   3. GAUGE — Current value snapshots
   ═══════════════════════════════════════════════════ */

/** Set a gauge to a specific value */
export function setGauge(name: string, value: number): void {
  const state = gauges.get(name) || { value: 0, min: Infinity, max: -Infinity, lastSetAt: 0 };
  state.value = value;
  state.min = Math.min(state.min, value);
  state.max = Math.max(state.max, value);
  state.lastSetAt = Date.now();
  gauges.set(name, state);
  checkThresholds(name, value);
}

/** Get current gauge snapshot */
export function getGauge(name: string): { value: number; min: number; max: number } | null {
  const state = gauges.get(name);
  if (!state) return null;
  return { value: state.value, min: state.min, max: state.max };
}

/** Reset a gauge */
export function resetGauge(name: string): void {
  gauges.delete(name);
}

/* ═══════════════════════════════════════════════════
   4. HISTOGRAM — Distribution tracking
   ═══════════════════════════════════════════════════ */

const MAX_HISTOGRAM_VALUES = 1000;

/** Record a value in a histogram */
export function recordHistogram(name: string, value: number): void {
  const state = histograms.get(name) || { values: [], sum: 0, count: 0, min: Infinity, max: -Infinity };
  state.values.push(value);
  if (state.values.length > MAX_HISTOGRAM_VALUES) {
    state.values.shift();
  }
  state.sum += value;
  state.count++;
  state.min = Math.min(state.min, value);
  state.max = Math.max(state.max, value);
  histograms.set(name, state);
}

/** Get histogram statistics including percentiles */
export function getHistogramStats(name: string): {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
} | null {
  const state = histograms.get(name);
  if (!state || state.values.length === 0) return null;

  const sorted = [...state.values].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    count: state.count,
    sum: Math.round(state.sum * 100) / 100,
    avg: Math.round((state.sum / state.count) * 100) / 100,
    min: state.min,
    max: state.max,
    p50: sorted[Math.floor(len * 0.5)],
    p90: sorted[Math.floor(len * 0.9)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.min(Math.floor(len * 0.99), len - 1)],
  };
}

/** Reset a histogram */
export function resetHistogram(name: string): void {
  histograms.delete(name);
}

/* ═══════════════════════════════════════════════════
   5. RATE COMPUTATION
   ═══════════════════════════════════════════════════ */

const rateWindows = new Map<string, number[]>();

/** Record a rate event (for computing events/second) */
export function recordRateEvent(name: string): void {
  const timestamps = rateWindows.get(name) || [];
  timestamps.push(Date.now());
  // Keep only last 60 seconds of timestamps
  const cutoff = Date.now() - 60_000;
  const filtered = timestamps.filter((t) => t >= cutoff);
  rateWindows.set(name, filtered);
}

/** Get rate (events per second) over the last windowMs */
export function getRate(name: string, windowMs = 60_000): number {
  const timestamps = rateWindows.get(name);
  if (!timestamps || timestamps.length === 0) return 0;
  const cutoff = Date.now() - windowMs;
  const count = timestamps.filter((t) => t >= cutoff).length;
  return Math.round((count / (windowMs / 1000)) * 100) / 100;
}

/* ═══════════════════════════════════════════════════
   6. THRESHOLD MONITORING
   ═══════════════════════════════════════════════════ */

export interface ThresholdRule {
  metric: string;
  operator: ">" | "<" | ">=" | "<=" | "==";
  value: number;
  severity: "warning" | "critical";
  message: string;
}

export interface ThresholdAlert {
  rule: ThresholdRule;
  currentValue: number;
  triggeredAt: number;
}

const thresholdRules: ThresholdRule[] = [];
const activeAlerts: ThresholdAlert[] = [];
const MAX_ALERTS = 100;
const alertListeners: Array<(alert: ThresholdAlert) => void> = [];

/** Register a threshold rule for automatic monitoring */
export function addThresholdRule(rule: ThresholdRule): void {
  thresholdRules.push(rule);
}

/** Remove all threshold rules for a metric */
export function removeThresholdRules(metric: string): void {
  const indices: number[] = [];
  for (let i = thresholdRules.length - 1; i >= 0; i--) {
    if (thresholdRules[i].metric === metric) indices.push(i);
  }
  for (const i of indices) thresholdRules.splice(i, 1);
}

/** Subscribe to threshold alerts */
export function onThresholdAlert(cb: (alert: ThresholdAlert) => void): () => void {
  alertListeners.push(cb);
  return () => {
    const idx = alertListeners.indexOf(cb);
    if (idx >= 0) alertListeners.splice(idx, 1);
  };
}

/** Get active alerts */
export function getActiveAlerts(): readonly ThresholdAlert[] {
  return [...activeAlerts];
}

/** Clear all alerts */
export function clearAlerts(): void {
  activeAlerts.length = 0;
}

function checkThresholds(metricName: string, value: number): void {
  for (const rule of thresholdRules) {
    if (rule.metric !== metricName) continue;

    let triggered = false;
    switch (rule.operator) {
      case ">":  triggered = value > rule.value; break;
      case "<":  triggered = value < rule.value; break;
      case ">=": triggered = value >= rule.value; break;
      case "<=": triggered = value <= rule.value; break;
      case "==": triggered = value === rule.value; break;
    }

    if (triggered) {
      const alert: ThresholdAlert = { rule, currentValue: value, triggeredAt: Date.now() };
      activeAlerts.push(alert);
      if (activeAlerts.length > MAX_ALERTS) activeAlerts.shift();
      for (const listener of alertListeners) {
        try { listener(alert); } catch { /* ignore */ }
      }
    }
  }
}

/* ═══════════════════════════════════════════════════
   7. METRIC SNAPSHOT (Dashboard-ready)
   ═══════════════════════════════════════════════════ */

export interface MetricSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, { value: number; min: number; max: number }>;
  histograms: Record<string, { count: number; avg: number; p50: number; p95: number }>;
  alertCount: number;
  collectedAt: number;
}

/** Get a snapshot of all metrics (for dashboard display) */
export function getMetricSnapshot(): MetricSnapshot {
  const snapshot: MetricSnapshot = {
    counters: {},
    gauges: {},
    histograms: {},
    alertCount: activeAlerts.length,
    collectedAt: Date.now(),
  };

  for (const [name, state] of counters) {
    snapshot.counters[name] = state.value;
  }

  for (const [name, state] of gauges) {
    snapshot.gauges[name] = { value: state.value, min: state.min, max: state.max };
  }

  for (const [name] of histograms) {
    const stats = getHistogramStats(name);
    if (stats) {
      snapshot.histograms[name] = {
        count: stats.count,
        avg: stats.avg,
        p50: stats.p50,
        p95: stats.p95,
      };
    }
  }

  return snapshot;
}

/** Reset all metrics */
export function resetAllMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
  rateWindows.clear();
  activeAlerts.length = 0;
  thresholdRules.length = 0;
}
