import type { Metric } from "web-vitals";

type ConnectionType = "slow-2g" | "2g" | "3g" | "4g" | string;

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
