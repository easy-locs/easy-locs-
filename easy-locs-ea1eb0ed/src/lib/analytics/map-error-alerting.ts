import { structuredLogger } from "@/lib/observability/structured-logger";
import { getRecentErrorBuffer } from "./map-error-analytics";
import type { MapErrorType } from "./map-error-analytics";

export interface AlertThreshold {
  id: string;
  windowMinutes: number;
  maxErrors: number;
  errorType?: MapErrorType;
  component?: string;
  enabled: boolean;
}

const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  { id: "global_spike", windowMinutes: 5, maxErrors: 20, enabled: true },
  { id: "token_spike", windowMinutes: 5, maxErrors: 5, errorType: "token", enabled: true },
  { id: "webgl_spike", windowMinutes: 10, maxErrors: 10, errorType: "webgl", enabled: true },
  { id: "network_burst", windowMinutes: 2, maxErrors: 15, errorType: "network", enabled: true },
  { id: "init_failure_burst", windowMinutes: 5, maxErrors: 10, errorType: "init_failure", enabled: true },
];

let customThresholds: AlertThreshold[] = [];
let lastAlertTimestamps = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60_000;

export function setAlertThresholds(thresholds: AlertThreshold[]): void {
  customThresholds = thresholds;
}

export function getAlertThresholds(): AlertThreshold[] {
  return [...DEFAULT_THRESHOLDS, ...customThresholds];
}

export interface AlertResult {
  thresholdId: string;
  triggered: boolean;
  count: number;
  threshold: number;
  windowMinutes: number;
}

export function evaluateAlertThresholds(): AlertResult[] {
  const buffer = getRecentErrorBuffer();
  const now = Date.now();
  const results: AlertResult[] = [];
  const allThresholds = getAlertThresholds();

  for (const t of allThresholds) {
    if (!t.enabled) continue;

    const windowStart = now - t.windowMinutes * 60_000;
    let count = 0;

    for (const entry of buffer) {
      if (entry.timestamp < windowStart) continue;
      if (t.errorType && entry.errorType !== t.errorType) continue;
      if (t.component && entry.component !== t.component) continue;
      count++;
    }

    const triggered = count >= t.maxErrors;
    results.push({
      thresholdId: t.id,
      triggered,
      count,
      threshold: t.maxErrors,
      windowMinutes: t.windowMinutes,
    });

    if (triggered) {
      const lastAlert = lastAlertTimestamps.get(t.id) ?? 0;
      if (now - lastAlert > ALERT_COOLDOWN_MS) {
        lastAlertTimestamps.set(t.id, now);
        fireAlert(t, count);
      }
    }
  }

  return results;
}

function fireAlert(threshold: AlertThreshold, count: number): void {
  structuredLogger.warn("maps", "map_error_alert_triggered", `Alert "${threshold.id}" fired: ${count} errors in ${threshold.windowMinutes}min (limit: ${threshold.maxErrors})`, {
    payload_summary: {
      threshold_id: threshold.id,
      count,
      max_errors: threshold.maxErrors,
      window_minutes: threshold.windowMinutes,
      error_type: threshold.errorType ?? "all",
    },
  });

  persistAlert(threshold, count).catch(() => {});
}

async function persistAlert(threshold: AlertThreshold, count: number): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("map_error_alert_log").insert({
      alert_type: threshold.id,
      threshold: threshold.maxErrors,
      actual_count: count,
      window_minutes: threshold.windowMinutes,
      details: {
        error_type: threshold.errorType ?? null,
        component: threshold.component ?? null,
      },
    });
  } catch {
    structuredLogger.warn("maps", "persist_alert_failed", `Failed to persist alert ${threshold.id}`);
  }
}
