export interface WebVitalMetric {
  name: "FCP" | "LCP" | "CLS" | "TBT" | "TTFB" | "INP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
}

const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

function rate(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const t = THRESHOLDS[name];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value >= t.poor) return "poor";
  return "needs-improvement";
}

const metrics: WebVitalMetric[] = [];

function record(name: WebVitalMetric["name"], value: number): void {
  const metric: WebVitalMetric = {
    name,
    value: Math.round(value * 100) / 100,
    rating: rate(name, value),
    timestamp: Date.now(),
  };
  metrics.push(metric);
  sendToPostHog(metric);
}

function sendToPostHog(metric: WebVitalMetric): void {
  try {
    import("@/lib/analytics/posthog").then(({ captureEvent }) => {
      captureEvent("web_vital_native", {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        page_path: window.location.pathname,
        device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        timestamp: metric.timestamp,
      });
    }).catch(() => {});
  } catch {}
}

export function initWebVitals(): void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          record("FCP", entry.startTime);
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
  } catch {}

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        record("LCP", entries[entries.length - 1].startTime);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput && layoutShift.value) {
          clsValue += layoutShift.value;
          record("CLS", clsValue);
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {}

  try {
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      record("TTFB", navEntries[0].responseStart);
    }
  } catch {}
}

export function getWebVitals(): WebVitalMetric[] {
  return [...metrics];
}

export function getWebVitalsSnapshot(): Record<string, { value: number; rating: string }> {
  const latest: Record<string, { value: number; rating: string }> = {};
  for (const m of metrics) {
    latest[m.name] = { value: m.value, rating: m.rating };
  }
  return latest;
}
