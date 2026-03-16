/**
 * Web Vitals — Reports Core Web Vitals (LCP, FID, CLS, FCP, TTFB) to console in dev
 * and optionally to an analytics endpoint in production.
 */

type Metric = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
};

const thresholds: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const t = thresholds[name];
  if (!t) return "good";
  if (value <= t[0]) return "good";
  if (value <= t[1]) return "needs-improvement";
  return "poor";
}

const reported = new Set<string>();

function onEntry(entry: PerformanceEntry) {
  const name = entry.entryType === "largest-contentful-paint" ? "LCP"
    : entry.entryType === "first-input" ? "FID"
    : entry.entryType === "layout-shift" ? "CLS"
    : entry.name;

  if (reported.has(name)) return;
  reported.add(name);

  const value = entry.entryType === "layout-shift"
    ? (entry as any).value
    : entry.startTime || (entry as any).processingStart - (entry as any).startTime;

  const rating = getRating(name, value);

  if (import.meta.env.DEV) {
    const icon = rating === "good" ? "🟢" : rating === "needs-improvement" ? "🟡" : "🔴";
    console.log(`[WebVitals] ${icon} ${name}: ${typeof value === "number" ? value.toFixed(1) : value}ms (${rating})`);
  }
}

export function initWebVitals() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  try {
    // LCP
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) onEntry(last);
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

    // FID
    const fidObs = new PerformanceObserver((list) => {
      list.getEntries().forEach(onEntry);
    });
    fidObs.observe({ type: "first-input", buffered: true });

    // CLS
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    });
    clsObs.observe({ type: "layout-shift", buffered: true });

    // Report CLS on page hide
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && !reported.has("CLS")) {
        reported.add("CLS");
        const rating = getRating("CLS", clsValue);
        if (import.meta.env.DEV) {
          const icon = rating === "good" ? "🟢" : rating === "needs-improvement" ? "🟡" : "🔴";
          console.log(`[WebVitals] ${icon} CLS: ${clsValue.toFixed(3)} (${rating})`);
        }
      }
    });

    // FCP & TTFB from navigation timing
    const paintObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          const rating = getRating("FCP", entry.startTime);
          if (import.meta.env.DEV) {
            const icon = rating === "good" ? "🟢" : rating === "needs-improvement" ? "🟡" : "🔴";
            console.log(`[WebVitals] ${icon} FCP: ${entry.startTime.toFixed(0)}ms (${rating})`);
          }
        }
      }
    });
    paintObs.observe({ type: "paint", buffered: true });

    // TTFB
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      const ttfb = nav.responseStart - nav.requestStart;
      if (ttfb > 0) {
        const rating = getRating("TTFB", ttfb);
        if (import.meta.env.DEV) {
          const icon = rating === "good" ? "🟢" : rating === "needs-improvement" ? "🟡" : "🔴";
          console.log(`[WebVitals] ${icon} TTFB: ${ttfb.toFixed(0)}ms (${rating})`);
        }
      }
    }
  } catch {
    // PerformanceObserver not fully supported
  }
}
