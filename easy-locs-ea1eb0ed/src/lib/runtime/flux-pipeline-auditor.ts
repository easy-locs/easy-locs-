/**
 * Flux Pipeline Auditor — Scans the platformBus and pipeline health.
 *
 * Latency and event tracking are provided by the BusObserver singleton
 * (typed public APIs only — no monkeypatching).
 */
import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";
import { platformBus } from "@/lib/shared/platform-bus";
import { busObserver, type BusLatencyMetric } from "./bus-observer";

export interface FluxIssue {
  type: "dead_listener" | "event_storm" | "unhandled_event" | "circular_dependency" | "stale_cache" | "broken_pipeline" | "orphan_emitter";
  pipeline?: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface FluxAuditReport {
  timestamp: string;
  scanCount: number;
  issues: FluxIssue[];
  totalPipelines: number;
  activePipelines: number;
  eventThroughput: number;
  score: number;
  status: "clean" | "warnings" | "degraded" | "critical";
  latencyMetrics: Record<string, BusLatencyMetric>;
}

let lastReport: FluxAuditReport | null = null;
let lastStatus: FluxAuditReport["status"] | null = null;
let scanCount = 0;

// Notification dedup: per issue-type, max 1 alert per 5 min
const notificationCooldowns = new Map<string, number>();
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

const CRITICAL_PIPELINES = [
  "runtime-pipeline",
  "module-health-system",
  "super-app-bridge",
  "commerce-payment-bridge",
  "radar-ingestor",
  "intelligence-orchestrator",
  "architecture-guard",
  "taxonomy-guard",
  "card-health-validator",
  "notification-bridge",
  "search-index",
  "close-flow-engine",
  "intent-bridge",
  "continuous-improvement",
  "css-ux-detector",
  "i18n-overflow-guard",
  "hook-health-monitor",
];

function canSendNotification(key: string): boolean {
  const last = notificationCooldowns.get(key) ?? 0;
  if (Date.now() - last < NOTIFICATION_COOLDOWN_MS) return false;
  notificationCooldowns.set(key, Date.now());
  return true;
}

async function emitFluxAlert(
  issueType: string,
  title: string,
  message: string,
  severity: "critical" | "high" | "medium" | "low"
): Promise<void> {
  const dedupKey = `flux_alert_${issueType}`;
  if (!canSendNotification(dedupKey)) return;

  platformBus.emit("flux:alert", {
    issueType,
    title,
    message,
    severity,
    timestamp: new Date().toISOString(),
  }, "system");

  try {
    const { db } = await import("@/services/db");
    // user_id="system" is a sentinel value for platform-originated alerts.
    // If the schema enforces a real FK, this insert will fail; the error is
    // surfaced via console.warn so ops teams can detect the misconfiguration.
    const { error: dbErr } = await db("app_notifications").insert({
      user_id: "system",
      scope: "admin",
      category: "flux_alert",
      title,
      body: message,
      severity: severity === "critical" ? "critical" : severity === "high" ? "warning" : "info",
      entity_type: "pipeline",
      metadata: {
        issueType,
        dedupe_key: dedupKey,
        channel: "in_app",
      },
    });
    if (dbErr) {
      console.warn(`[flux-auditor] app_notifications insert failed (${issueType}):`, dbErr.message);
    }
  } catch (e) {
    console.warn("[flux-auditor] app_notifications insert threw:", e);
  }
}

function detectEventStorms(): FluxIssue[] {
  const issues: FluxIssue[] = [];
  const now = Date.now();
  const history = busObserver.getEventHistory();
  const recentEvents = history.filter(e => now - e.timestamp < 5000);

  if (recentEvents.length > 200) {
    const eventCounts: Record<string, number> = {};
    for (const e of recentEvents) {
      eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    }
    const topEvent = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0];
    issues.push({
      type: "event_storm",
      detail: `${recentEvents.length} events in 5s — storm detected. Top: ${topEvent?.[0]} (${topEvent?.[1]}x)`,
      severity: "critical",
    });
  }

  const eventCounts: Record<string, number> = {};
  for (const e of recentEvents) {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  }
  for (const [event, count] of Object.entries(eventCounts)) {
    if (count > 50) {
      issues.push({
        type: "event_storm",
        pipeline: event,
        detail: `Event "${event}" fired ${count}x in 5s — possible infinite loop`,
        severity: "high",
      });
    }
  }

  return issues;
}

function detectStalePipelines(): FluxIssue[] {
  const issues: FluxIssue[] = [];
  const now = Date.now();
  const elapsed = now - busObserver.getLastEventCountReset();

  if (elapsed > 60_000 && busObserver.getEventCounter() === 0) {
    issues.push({
      type: "broken_pipeline",
      detail: `No events received in ${Math.round(elapsed / 1000)}s — platform bus may be dead`,
      severity: "critical",
    });
  }

  return issues;
}

function getActivePipelineCount(): number {
  const history = busObserver.getEventHistory();
  const recentEventNames = new Set(
    history
      .filter(e => Date.now() - e.timestamp < 30_000)
      .map(e => e.event.split(":")[0])
  );
  return recentEventNames.size;
}

export function runFluxAudit(): FluxAuditReport {
  // Guard: ensure the observer is installed before reading any metrics.
  // This covers the edge case where runFluxAudit() is called before
  // initSystemLock() has had a chance to call busObserver.install().
  if (!busObserver.isInstalled()) {
    busObserver.install();
  }

  scanCount++;

  const issues: FluxIssue[] = [
    ...detectEventStorms(),
    ...detectStalePipelines(),
  ];

  const activePipelines = getActivePipelineCount();
  const now = Date.now();
  const elapsed = Math.max(1, (now - busObserver.getLastEventCountReset()) / 1000);
  const throughput = Math.round(busObserver.getEventCounter() / elapsed * 60);
  const latencyMetrics = busObserver.getLatencyMetrics();

  // Report per-event-type latency to health-aggregator
  for (const [eventType, metric] of Object.entries(latencyMetrics)) {
    const isHighLatency = metric.avgLatencyMs > 5000;
    reportHealth(
      `flux-latency:${eventType}`,
      isHighLatency ? "degraded" : "ok",
      metric.avgLatencyMs,
      isHighLatency ? `High latency: avg ${metric.avgLatencyMs}ms, p95 ${metric.p95LatencyMs}ms` : undefined
    );
  }

  const criticals = issues.filter(i => i.severity === "critical").length;
  const highs = issues.filter(i => i.severity === "high").length;
  const score = Math.max(0, 100 - criticals * 30 - highs * 15 - (issues.length - criticals - highs) * 5);

  let status: FluxAuditReport["status"] = "clean";
  if (criticals > 0) status = "critical";
  else if (highs > 0) status = "degraded";
  else if (issues.length > 0) status = "warnings";

  // Restore aggregate flux-pipelines health key for downstream dashboard compatibility.
  // Maps FluxAuditReport.status → ModuleStatus ("ok"|"degraded"|"down"|"unknown").
  // Per-event latency keys (flux-latency:<type>) are also emitted above.
  const moduleStatus: "ok" | "degraded" | "down" =
    status === "critical" ? "down" :
    status === "degraded" ? "degraded" :
    "ok";
  reportHealth(
    "flux-pipelines",
    moduleStatus,
    score,
    issues.length > 0
      ? `${criticals} critical, ${highs} high, ${issues.length} total issues`
      : undefined
  );

  const report: FluxAuditReport = {
    timestamp: new Date().toISOString(),
    scanCount,
    issues,
    totalPipelines: CRITICAL_PIPELINES.length,
    activePipelines,
    eventThroughput: throughput,
    score,
    status,
    latencyMetrics,
  };

  // Reset event counter for the next scan window (dead-pipeline detection per window)
  busObserver.resetEventCounter();

  // Emit flux:recovered when recovering from critical/degraded → clean/warnings
  const prevStatus = lastStatus;
  lastReport = report;
  lastStatus = status;

  if (
    (prevStatus === "critical" || prevStatus === "degraded") &&
    (status === "clean" || status === "warnings")
  ) {
    platformBus.emit("flux:recovered", { previousStatus: prevStatus, currentStatus: status, scanCount }, "system");
  }

  // Fire alerts via notification system for critical/high issues
  for (const issue of issues) {
    if (issue.severity === "critical") {
      reportAnomaly("architecture_violation", "flux-pipeline-auditor", issue.detail, "critical");
    }

    if (issue.severity === "critical" || issue.severity === "high") {
      let alertKey = `${issue.type}_general`;
      let title = "Flux Pipeline Issue";
      let msg = issue.detail;

      if (issue.type === "event_storm") {
        alertKey = `event_storm_${issue.pipeline ?? "global"}`;
        title = "Event Storm Detected";
        msg = issue.detail;
      } else if (issue.type === "broken_pipeline") {
        alertKey = "broken_pipeline_dead_bus";
        title = "Platform Bus Dead";
        msg = issue.detail;
      }

      emitFluxAlert(alertKey, title, msg, issue.severity).catch(() => {});
    }
  }

  return report;
}

export function getLastFluxReport(): FluxAuditReport | null {
  return lastReport;
}

/** @deprecated Use getLastFluxReport() — backward-compat alias for existing consumers */
export const getLastFluxAuditReport = getLastFluxReport;
