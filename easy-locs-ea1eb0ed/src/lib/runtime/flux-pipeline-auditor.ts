import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";
import { platformBus } from "@/lib/shared/platform-bus";

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
}

let lastReport: FluxAuditReport | null = null;
let scanCount = 0;
let eventCounter = 0;
let lastEventCountReset = Date.now();
let eventHistory: Array<{ event: string; timestamp: number }> = [];
const MAX_HISTORY = 500;

const CRITICAL_PIPELINES = [
  "runtime-pipeline",
  "module-health-system",
  "super-app-bridge",
  "commerce-payment-bridge",
  "radar-ingestor",
  "intelligence-orchestrator",
  "data-quality-engine",
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

let busListenerInstalled = false;

function installBusListener() {
  if (busListenerInstalled) return;
  busListenerInstalled = true;

  const originalEmit = platformBus.emit.bind(platformBus);
  platformBus.emit = ((event: string, ...args: any[]) => {
    eventCounter++;
    eventHistory.push({ event, timestamp: Date.now() });
    if (eventHistory.length > MAX_HISTORY) {
      eventHistory = eventHistory.slice(-MAX_HISTORY);
    }
    return originalEmit(event, ...args);
  }) as typeof platformBus.emit;
}

function detectEventStorms(): FluxIssue[] {
  const issues: FluxIssue[] = [];
  const now = Date.now();
  const recentEvents = eventHistory.filter(e => now - e.timestamp < 5000);

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
  const elapsed = now - lastEventCountReset;

  if (elapsed > 60_000 && eventCounter === 0) {
    issues.push({
      type: "broken_pipeline",
      detail: `No events received in ${Math.round(elapsed / 1000)}s — platform bus may be dead`,
      severity: "critical",
    });
  }

  return issues;
}

function getActivePipelineCount(): number {
  const recentEventNames = new Set(eventHistory.filter(e => Date.now() - e.timestamp < 30_000).map(e => e.event.split(":")[0]));
  return recentEventNames.size;
}

export function runFluxAudit(): FluxAuditReport {
  installBusListener();
  scanCount++;

  const issues: FluxIssue[] = [
    ...detectEventStorms(),
    ...detectStalePipelines(),
  ];

  const activePipelines = getActivePipelineCount();
  const now = Date.now();
  const elapsed = Math.max(1, (now - lastEventCountReset) / 1000);
  const throughput = Math.round(eventCounter / elapsed * 60);

  const criticals = issues.filter(i => i.severity === "critical").length;
  const highs = issues.filter(i => i.severity === "high").length;
  const score = Math.max(0, 100 - criticals * 30 - highs * 15 - (issues.length - criticals - highs) * 5);

  let status: FluxAuditReport["status"] = "clean";
  if (criticals > 0) status = "critical";
  else if (highs > 0) status = "degraded";
  else if (issues.length > 0) status = "warnings";

  const report: FluxAuditReport = {
    timestamp: new Date().toISOString(),
    scanCount,
    issues,
    totalPipelines: CRITICAL_PIPELINES.length,
    activePipelines,
    eventThroughput: throughput,
    score,
    status,
  };

  lastReport = report;

  if (criticals > 0) {
    for (const issue of issues.filter(i => i.severity === "critical")) {
      reportAnomaly("architecture_violation", "flux-pipeline-auditor", issue.detail, "critical");
    }
  }

  reportHealth("flux-pipelines",
    status === "critical" ? "degraded" : "ok",
    undefined,
    `${activePipelines}/${CRITICAL_PIPELINES.length} active, ${throughput} events/min, score ${score}/100`
  );

  eventCounter = 0;
  lastEventCountReset = now;

  return report;
}

export function getLastFluxAuditReport(): FluxAuditReport | null {
  return lastReport;
}
