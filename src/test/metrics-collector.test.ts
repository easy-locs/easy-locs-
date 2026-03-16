import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  incrementCounter,
  getCounter,
  resetCounter,
  setGauge,
  getGauge,
  resetGauge,
  recordHistogram,
  getHistogramStats,
  resetHistogram,
  recordRateEvent,
  getRate,
  addThresholdRule,
  onThresholdAlert,
  getActiveAlerts,
  clearAlerts,
  getMetricSnapshot,
  resetAllMetrics,
} from "@/lib/metrics-collector";

beforeEach(() => resetAllMetrics());

/* ═══════════════════════════════════════════════════
   COUNTERS
   ═══════════════════════════════════════════════════ */
describe("counters", () => {
  it("increments and reads", () => {
    incrementCounter("requests");
    incrementCounter("requests");
    expect(getCounter("requests")).toBe(2);
  });
  it("increments by amount", () => {
    incrementCounter("bytes", 1024);
    incrementCounter("bytes", 512);
    expect(getCounter("bytes")).toBe(1536);
  });
  it("returns 0 for unknown", () => {
    expect(getCounter("unknown")).toBe(0);
  });
  it("resets", () => {
    incrementCounter("x", 5);
    resetCounter("x");
    expect(getCounter("x")).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════
   GAUGES
   ═══════════════════════════════════════════════════ */
describe("gauges", () => {
  it("sets and reads", () => {
    setGauge("cpu", 45);
    setGauge("cpu", 60);
    const g = getGauge("cpu");
    expect(g?.value).toBe(60);
    expect(g?.min).toBe(45);
    expect(g?.max).toBe(60);
  });
  it("returns null for unknown", () => {
    expect(getGauge("nope")).toBeNull();
  });
  it("resets", () => {
    setGauge("mem", 80);
    resetGauge("mem");
    expect(getGauge("mem")).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════
   HISTOGRAMS
   ═══════════════════════════════════════════════════ */
describe("histograms", () => {
  it("records and computes stats", () => {
    for (let i = 1; i <= 100; i++) recordHistogram("latency", i);
    const stats = getHistogramStats("latency");
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(100);
    expect(stats!.min).toBe(1);
    expect(stats!.max).toBe(100);
    expect(stats!.avg).toBe(50.5);
    expect(stats!.p50).toBe(51);
    expect(stats!.p90).toBe(91);
    expect(stats!.p95).toBe(96);
  });
  it("returns null for unknown", () => {
    expect(getHistogramStats("nope")).toBeNull();
  });
  it("resets", () => {
    recordHistogram("x", 42);
    resetHistogram("x");
    expect(getHistogramStats("x")).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════
   RATE COMPUTATION
   ═══════════════════════════════════════════════════ */
describe("rate", () => {
  it("computes rate", () => {
    for (let i = 0; i < 10; i++) recordRateEvent("api_calls");
    const rate = getRate("api_calls", 60_000);
    expect(rate).toBeGreaterThan(0);
  });
  it("returns 0 for unknown", () => {
    expect(getRate("unknown")).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════
   THRESHOLD MONITORING
   ═══════════════════════════════════════════════════ */
describe("thresholds", () => {
  it("triggers alert on threshold breach", () => {
    const cb = vi.fn();
    onThresholdAlert(cb);
    addThresholdRule({
      metric: "errors",
      operator: ">=",
      value: 5,
      severity: "critical",
      message: "Error rate too high",
    });
    for (let i = 0; i < 5; i++) incrementCounter("errors");
    expect(cb).toHaveBeenCalled();
    expect(getActiveAlerts().length).toBeGreaterThan(0);
  });
  it("clears alerts", () => {
    incrementCounter("x");
    clearAlerts();
    expect(getActiveAlerts()).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════
   METRIC SNAPSHOT
   ═══════════════════════════════════════════════════ */
describe("getMetricSnapshot", () => {
  it("returns all metrics", () => {
    incrementCounter("req", 10);
    setGauge("mem", 75);
    recordHistogram("lat", 50);
    const snap = getMetricSnapshot();
    expect(snap.counters.req).toBe(10);
    expect(snap.gauges.mem.value).toBe(75);
    expect(snap.histograms.lat.count).toBe(1);
    expect(snap.collectedAt).toBeGreaterThan(0);
  });
});
