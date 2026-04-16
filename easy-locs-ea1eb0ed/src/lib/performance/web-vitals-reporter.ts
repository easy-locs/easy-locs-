import type { Metric } from "web-vitals";

type ConnectionType = "slow-2g" | "2g" | "3g" | "4g" | string;

/**
 * Performance budgets aligned with task-767 (Big Tech standards).
 *   LCP < 1.8s, INP < 200ms, CLS < 0.05
 *   FCP < 1.0s, TTFB < 600ms
 * Going over the "regression" threshold pushes a monitoring event so the
 * Performance Lab dashboard surfaces the spike.
 */
const REGRESSION_BUDGETS_MS: Record<string, number> = {
  LCP: 1800,
  INP: 200,
  FCP: 1000,
  TTFB: 600,
  FID: 100,
};
const CLS_REGRESSION_BUDGET = 0.05;

function evaluateRegression(metric: Metric): { breached: boolean; budget: number } {
  if (metric.name === "CLS") {
    return { breached: metric.value > CLS_REGRESSION_BUDGET, budget: CLS_REGRESSION_BUDGET };
  }
  const budget = REGRESSION_BUDGETS_MS[metric.name];
  if (!budget) return { breached: false, budget: 0 };
  return { breached: metric.value > budget, budget };
}

const alertedMetrics = new Set<string>();
function alertOnRegression(metric: Metric): void {
  const { breached, budget } = evaluateRegression(metric);
  if (!breached) return;
  // Dedup per page+metric to avoid noisy spam in single-page sessions.
  const key = `${window.location.pathname}::${metric.name}`;
  if (alertedMetrics.has(key)) return;
  alertedMetrics.add(key);

  const isCls = metric.name === "CLS";
  const value = isCls ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`;
  const limit = isCls ? budget.toFixed(3) : `${budget}ms`;

  // Lazy-load the monitoring module so the perf telemetry path stays
  // off the critical bundle when no regression is observed.
  import("@/lib/monitoring")
    .then(({ pushEvent }) => {
      pushEvent({
        type: "performance",
        severity: metric.rating === "poor" ? "warning" : "info",
        source: "web-vitals",
        message: `Web Vital regression: ${metric.name} ${value} > budget ${limit}`,
        metadata: {
          metric: metric.name,
          value: metric.value,
          rating: metric.rating,
          budget,
          page_path: window.location.pathname,
        },
      });
    })
    .catch(() => {});
}

interface VitalPayload {
  metric_name: string;
  metric_value: number;
  metric_rating: string;
  metric_id: string;
  page_path: string;
  device_type: string;
  connection_type: ConnectionType;
  viewport_width: number;
  viewport_height: number;
  user_agent: string;
  timestamp: number;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getConnectionType(): ConnectionType {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  return nav.connection?.effectiveType ?? "unknown";
}

function buildPayload(metric: Metric): VitalPayload {
  return {
    metric_name: metric.name,
    metric_value: Math.round(metric.value * 1000) / 1000,
    metric_rating: metric.rating,
    metric_id: metric.id,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    connection_type: getConnectionType(),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    user_agent: navigator.userAgent,
    timestamp: Date.now(),
  };
}

function sendToPostHog(payload: VitalPayload): void {
  try {
    import("@/lib/analytics/posthog").then(({ captureEvent }) => {
      captureEvent("web_vital", payload as unknown as Record<string, unknown>);
    }).catch(() => {});
  } catch {}
}

export function reportWebVital(metric: Metric): void {
  const payload = buildPayload(metric);
  sendToPostHog(payload);
  alertOnRegression(metric);

  if (import.meta.env.DEV) {
    const color = metric.rating === "good" ? "\x1b[32m" : metric.rating === "poor" ? "\x1b[31m" : "\x1b[33m";
    console.log(
      `${color}[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})\x1b[0m`
    );
  }
}

export async function initWebVitalsReporter(): Promise<void> {
  try {
    const { onCLS, onFID, onLCP, onTTFB, onINP, onFCP } = await import("web-vitals");

    onCLS(reportWebVital);
    onFID(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
    onINP(reportWebVital);
    onFCP(reportWebVital);
  } catch {}
}
