import { platformBus } from "@/lib/shared/platform-bus";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { enqueueDbObservabilityMetric } from "@/lib/runtime/runtime-rpc-client";

export interface DbMetric {
  name: string;
  value: number;
  unit: string;
  thresholdWarn?: number;
  thresholdCrit?: number;
  isAlert: boolean;
  recordedAt: number;
}

export interface DbObservabilitySnapshot {
  connectionUsagePercent: number;
  lockPressure: number;
  slowQueryCount: number;
  cronRunsLast24h: number;
  cronFailureRate: number;
  edgeFunctionFailureRate: number;
  storageGrowthMb: number;
  eventTableRowCount: number;
  queueDepth: number;
  dlqDepth: number;
}

const ALERT_THRESHOLDS = {
  connectionUsagePercent: { warn: 70, crit: 85 },
  lockPressure: { warn: 5, crit: 15 },
  slowQueryCount: { warn: 10, crit: 50 },
  cronFailureRate: { warn: 0.05, crit: 0.10 },
  edgeFunctionFailureRate: { warn: 0.05, crit: 0.15 },
  queueDepth: { warn: 500, crit: 1000 },
  dlqDepth: { warn: 25, crit: 50 },
};

const metricsHistory: DbMetric[] = [];
const MAX_METRICS_HISTORY = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SupabaseClient type varies by project config
export async function collectDbMetrics(supabaseClient: any): Promise<DbObservabilitySnapshot> {
  const snapshot: DbObservabilitySnapshot = {
    connectionUsagePercent: 0,
    lockPressure: 0,
    slowQueryCount: 0,
    cronRunsLast24h: 0,
    cronFailureRate: 0,
    edgeFunctionFailureRate: 0,
    storageGrowthMb: 0,
    eventTableRowCount: 0,
    queueDepth: 0,
    dlqDepth: 0,
  };

  try {
    const { count: queuePending } = await supabaseClient
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    snapshot.queueDepth = queuePending ?? 0;

    const { count: dlqPending } = await supabaseClient
      .from("dead_letter_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "retrying"]);
    snapshot.dlqDepth = dlqPending ?? 0;

    const { count: eventCount } = await supabaseClient
      .from("server_events")
      .select("id", { count: "exact", head: true });
    snapshot.eventTableRowCount = eventCount ?? 0;

    const { data: engines } = await supabaseClient
      .from("engine_supervisor")
      .select("total_runs, success_rate, consecutive_failures")
      .limit(100);

    if (engines && engines.length > 0) {
      const totalRuns = engines.reduce((acc: number, e: any) => acc + (e.total_runs ?? 0), 0);
      const avgSuccessRate = engines.reduce((acc: number, e: any) => acc + (e.success_rate ?? 100), 0) / engines.length;
      snapshot.cronRunsLast24h = totalRuns;
      snapshot.cronFailureRate = Math.max(0, (100 - avgSuccessRate) / 100);
    }

    const metrics: DbMetric[] = [
      createMetric("queue_depth", snapshot.queueDepth, "count", ALERT_THRESHOLDS.queueDepth),
      createMetric("dlq_depth", snapshot.dlqDepth, "count", ALERT_THRESHOLDS.dlqDepth),
      createMetric("event_table_rows", snapshot.eventTableRowCount, "count"),
      createMetric("cron_failure_rate", snapshot.cronFailureRate, "ratio", ALERT_THRESHOLDS.cronFailureRate),
      createMetric("cron_runs_24h", snapshot.cronRunsLast24h, "count"),
    ];

    for (const m of metrics) {
      metricsHistory.push(m);
      if (metricsHistory.length > MAX_METRICS_HISTORY) metricsHistory.shift();

      if (m.isAlert) {
        platformBus.emit("db_observability:alert", {
          metric: m.name,
          value: m.value,
          unit: m.unit,
          thresholdWarn: m.thresholdWarn,
          thresholdCrit: m.thresholdCrit,
        }, "system");

        structuredLogger.warn(
          "system",
          "db_observability.alert",
          `Metric ${m.name}=${m.value}${m.unit} exceeds threshold`,
        );
      }

      enqueueDbObservabilityMetric({
        metricName: m.name,
        metricValue: m.value,
        metricUnit: m.unit,
        thresholdWarn: m.thresholdWarn,
        thresholdCrit: m.thresholdCrit,
      });
    }

    return snapshot;
  } catch (err: any) {
    structuredLogger.error("system", "db_observability.collect_failed", err?.message ?? String(err));
    return snapshot;
  }
}

function createMetric(
  name: string,
  value: number,
  unit: string,
  thresholds?: { warn: number; crit: number },
): DbMetric {
  let isAlert = false;
  if (thresholds) {
    isAlert = value >= thresholds.warn;
  }

  return {
    name,
    value,
    unit,
    thresholdWarn: thresholds?.warn,
    thresholdCrit: thresholds?.crit,
    isAlert,
    recordedAt: Date.now(),
  };
}

export function getMetricsHistory(metricName?: string, limit = 50): DbMetric[] {
  const filtered = metricName
    ? metricsHistory.filter(m => m.name === metricName)
    : metricsHistory;
  return filtered.slice(-limit);
}

export function getActiveAlerts(): DbMetric[] {
  const latest = new Map<string, DbMetric>();
  for (const m of metricsHistory) {
    if (m.isAlert) latest.set(m.name, m);
  }
  return Array.from(latest.values());
}

export function getDbHealthSummary(): {
  healthy: boolean;
  alertCount: number;
  criticalAlerts: string[];
  metrics: Record<string, number>;
} {
  const alerts = getActiveAlerts();
  const criticalAlerts = alerts
    .filter(a => a.thresholdCrit !== undefined && a.value >= a.thresholdCrit)
    .map(a => a.name);

  const latestMetrics: Record<string, number> = {};
  const seen = new Set<string>();
  for (let i = metricsHistory.length - 1; i >= 0 && seen.size < 20; i--) {
    const m = metricsHistory[i];
    if (!seen.has(m.name)) {
      latestMetrics[m.name] = m.value;
      seen.add(m.name);
    }
  }

  return {
    healthy: criticalAlerts.length === 0,
    alertCount: alerts.length,
    criticalAlerts,
    metrics: latestMetrics,
  };
}

export function resetDbObservability(): void {
  metricsHistory.length = 0;
}
