/**
 * Global Orchestration Engine — Coordinates cross-engine dependencies,
 * detects collisions, validates execution order, and provides
 * a unified status view for the business cockpit.
 * NOW WIRED TO BACKEND (engine_supervisor) — no more dead client layer.
 */

import { ENGINE_METADATA, detectEngineCollisions, type CollisionReport, type RuntimeStatus } from "./engine-metadata-registry";
import { fetchBackendEngineStatus, type EngineJobStatus } from "./backend-engine-status";
import { WARNING_RULES } from "./platform-orchestrator-engine";

export interface OrchestrationStatus {
  totalEngines: number;
  byTier: Record<string, number>;
  byFunction: Record<string, number>;
  byVertical: Record<string, number>;
  collisions: CollisionReport[];
  runtimeSummary: {
    active: number;
    idle: number;
    warning: number;
    error: number;
    pending: number;
  };
  healthScore: number;
  timestamp: string;
}

/** Derive runtime status from raw engine output with precise warning rules */
export function deriveRuntimeStatus(
  rawStatus: "ok" | "error" | "pending" | "idle" | "warning",
  job: { name: string; itemsProcessed: number; runCount: number; lastRun?: string | null; lastDetail?: string | null },
  canRunIdle: boolean
): RuntimeStatus {
  if (rawStatus === "error") return "error";
  if (rawStatus === "pending") return "pending";
  if (rawStatus === "warning") return "warning";

  const meta = ENGINE_METADATA[job.name];
  for (const rule of WARNING_RULES) {
    if (rule.check(job, meta)) return "warning";
  }

  if (rawStatus === "ok" && job.itemsProcessed === 0 && !canRunIdle) return "idle";
  return "ok";
}

/** Get full orchestration status — fetches from backend */
export async function getOrchestrationStatus(): Promise<OrchestrationStatus> {
  const status = await fetchBackendEngineStatus();
  const collisions = detectEngineCollisions();

  const byTier: Record<string, number> = { critical: 0, priority: 0, standard: 0, optimizable: 0 };
  const byFunction: Record<string, number> = {};
  const byVertical: Record<string, number> = {};

  for (const meta of Object.values(ENGINE_METADATA)) {
    byTier[meta.tier] = (byTier[meta.tier] || 0) + 1;
    byFunction[meta.businessFn] = (byFunction[meta.businessFn] || 0) + 1;
    byVertical[meta.vertical] = (byVertical[meta.vertical] || 0) + 1;
  }

  const runtimeSummary = { active: 0, idle: 0, warning: 0, error: 0, pending: 0 };
  for (const job of status.jobs) {
    const meta = ENGINE_METADATA[job.name];
    const derived = deriveRuntimeStatus(
      job.lastStatus,
      { name: job.name, itemsProcessed: job.itemsProcessed, runCount: job.runCount, lastRun: job.lastRun, lastDetail: job.lastDetail },
      meta?.canRunIdle ?? true
    );
    if (derived === "ok") runtimeSummary.active++;
    else if (derived === "idle") runtimeSummary.idle++;
    else if (derived === "warning") runtimeSummary.warning++;
    else if (derived === "error") runtimeSummary.error++;
    else runtimeSummary.pending++;
  }

  const criticalErrors = status.jobs.filter(j => {
    const meta = ENGINE_METADATA[j.name];
    return meta?.tier === "critical" && j.lastStatus === "error";
  }).length;

  const healthScore = Math.max(0, 100 - (criticalErrors * 15) - (runtimeSummary.error * 5) - (collisions.length * 3));

  return {
    totalEngines: status.totalJobs,
    byTier,
    byFunction,
    byVertical,
    collisions,
    runtimeSummary,
    healthScore,
    timestamp: new Date().toISOString(),
  };
}

/** Run orchestration check and log results */
export async function runGlobalOrchestration(): Promise<OrchestrationStatus> {
  const status = await getOrchestrationStatus();

  console.log(`[global-orchestration] ${status.totalEngines} engines | Health: ${status.healthScore}/100`);
  console.log(`[global-orchestration] Active:${status.runtimeSummary.active} Idle:${status.runtimeSummary.idle} Warning:${status.runtimeSummary.warning} Error:${status.runtimeSummary.error}`);

  if (status.collisions.length > 0) {
    console.warn(`[global-orchestration] ⚠️ ${status.collisions.length} field collisions detected`);
  }

  return status;
}
