/**
 * Pipeline Metrics — Per-stage throughput, error rate, and processing time tracking.
 *
 * Exposes metrics to the health-aggregator for admin control room visibility.
 * In-memory store with rolling 1h window.
 */
import { reportHealth } from "@/lib/runtime/health-aggregator";

export interface StageMetric {
  stage: string;
  totalRuns: number;
  totalProcessed: number;
  totalErrors: number;
  totalDurationMs: number;
  lastRunAt: string | null;
  avgDurationMs: number;
  errorRate: number;
  throughputPerMin: number;
}

export interface PipelineMetricsSnapshot {
  capturedAt: string;
  stages: StageMetric[];
  totalRuns: number;
  overallErrorRate: number;
  overallThroughput: number;
}

interface StageEntry {
  stage: string;
  processed: number;
  errors: number;
  durationMs: number;
  timestamp: number;
}

const WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const MAX_ENTRIES = 10_000;

let entries: StageEntry[] = [];
let listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function pruneOldEntries() {
  const cutoff = Date.now() - WINDOW_MS;
  if (entries.length > MAX_ENTRIES || (entries.length > 0 && entries[0].timestamp < cutoff)) {
    entries = entries.filter(e => e.timestamp >= cutoff);
  }
}

/**
 * Record metrics for a completed pipeline stage run.
 */
export function recordStageRun(stage: string, processed: number, errors: number, durationMs: number) {
  entries.push({ stage, processed, errors, durationMs, timestamp: Date.now() });
  pruneOldEntries();

  const metric = getStageMetric(stage);
  reportHealth(
    `pipeline:${stage}`,
    metric.errorRate > 0.5 ? "degraded" : "ok",
    metric.avgDurationMs,
    metric.errorRate > 0.5 ? `High error rate: ${(metric.errorRate * 100).toFixed(1)}%` : undefined
  );

  notify();
}

/**
 * Get metrics for a specific stage (from rolling window).
 */
export function getStageMetric(stage: string): StageMetric {
  const cutoff = Date.now() - WINDOW_MS;
  const stageEntries = entries.filter(e => e.stage === stage && e.timestamp >= cutoff);

  const totalRuns = stageEntries.length;
  const totalProcessed = stageEntries.reduce((s, e) => s + e.processed, 0);
  const totalErrors = stageEntries.reduce((s, e) => s + e.errors, 0);
  const totalDurationMs = stageEntries.reduce((s, e) => s + e.durationMs, 0);
  const lastEntry = stageEntries[stageEntries.length - 1];
  const windowSeconds = Math.max(1, WINDOW_MS / 1000);

  return {
    stage,
    totalRuns,
    totalProcessed,
    totalErrors,
    totalDurationMs,
    lastRunAt: lastEntry ? new Date(lastEntry.timestamp).toISOString() : null,
    avgDurationMs: totalRuns > 0 ? Math.round(totalDurationMs / totalRuns) : 0,
    errorRate: totalRuns > 0 ? totalErrors / totalRuns : 0,
    throughputPerMin: Math.round((totalProcessed / windowSeconds) * 60),
  };
}

/**
 * Get all stage metrics for the rolling window.
 */
export function getAllPipelineMetrics(): PipelineMetricsSnapshot {
  const cutoff = Date.now() - WINDOW_MS;
  const recentEntries = entries.filter(e => e.timestamp >= cutoff);

  const stages = [...new Set(recentEntries.map(e => e.stage))];
  const stageMetrics = stages.map(s => getStageMetric(s));

  const totalRuns = recentEntries.length;
  const totalErrors = recentEntries.reduce((s, e) => s + e.errors, 0);
  const totalProcessed = recentEntries.reduce((s, e) => s + e.processed, 0);
  const windowSeconds = Math.max(1, WINDOW_MS / 1000);

  return {
    capturedAt: new Date().toISOString(),
    stages: stageMetrics,
    totalRuns,
    overallErrorRate: totalRuns > 0 ? totalErrors / totalRuns : 0,
    overallThroughput: Math.round((totalProcessed / windowSeconds) * 60),
  };
}

/**
 * Subscribe to metric updates.
 */
export function subscribePipelineMetrics(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Get a summary suitable for health dashboard display.
 */
export function getPipelineHealthSummary(): {
  status: "healthy" | "degraded" | "critical";
  message: string;
  stageCount: number;
  topErrorStage: string | null;
  avgThroughputPerMin: number;
} {
  const snapshot = getAllPipelineMetrics();

  const errorStages = snapshot.stages.filter(s => s.errorRate > 0.2);
  const criticalStages = snapshot.stages.filter(s => s.errorRate > 0.5);

  let status: "healthy" | "degraded" | "critical" = "healthy";
  if (criticalStages.length > 0) status = "critical";
  else if (errorStages.length > 0) status = "degraded";

  const topErrorStage = snapshot.stages.reduce<StageMetric | null>((top, s) => {
    return !top || s.errorRate > top.errorRate ? s : top;
  }, null);

  return {
    status,
    message: `${snapshot.stages.length} stages active, ${(snapshot.overallErrorRate * 100).toFixed(1)}% error rate, ${snapshot.overallThroughput} items/min`,
    stageCount: snapshot.stages.length,
    topErrorStage: topErrorStage && topErrorStage.errorRate > 0.1 ? topErrorStage.stage : null,
    avgThroughputPerMin: snapshot.overallThroughput,
  };
}
