/**
 * Web Vitals — Reports Core Web Vitals using the official web-vitals library.
 * Tracks LCP, FID, CLS, FCP, TTFB, INP with proper attribution.
 * Stores metrics in-memory for admin dashboard access.
 */
import type { Metric } from "web-vitals";

export type { Metric };

const vitalsLog: Metric[] = [];
const MAX_LOG = 100;

function defaultReporter(metric: Metric) {
  vitalsLog.push(metric);
  if (vitalsLog.length > MAX_LOG) vitalsLog.shift();

  if (import.meta.env.DEV) {
    const color =
      metric.rating === "good"
        ? "#0cce6b"
        : metric.rating === "needs-improvement"
          ? "#ffa400"
          : "#ff4e42";
    console.log(
      `%c[web-vitals] ${metric.name}: ${metric.name === "CLS" ? metric.value.toFixed(3) : Math.round(metric.value)}${metric.name === "CLS" ? "" : "ms"} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }
}

let initialized = false;

export function initWebVitals(onReport?: (metric: Metric) => void) {
  if (initialized) return;
  initialized = true;

  const report = onReport || defaultReporter;

  import("web-vitals").then(({ onCLS, onFID, onLCP, onINP, onTTFB, onFCP }) => {
    onCLS(report);
    onFID(report);
    onLCP(report);
    onINP(report);
    onTTFB(report);
    onFCP(report);
  }).catch(() => {});
}

export function getVitalsLog(): readonly Metric[] {
  return vitalsLog;
}

export function getLatestVitals(): Record<string, { value: number; rating: string }> {
  const latest: Record<string, { value: number; rating: string }> = {};
  for (const m of vitalsLog) {
    latest[m.name] = { value: m.value, rating: m.rating };
  }
  return latest;
}
