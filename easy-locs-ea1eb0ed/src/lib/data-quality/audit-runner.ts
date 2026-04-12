import type { FullAuditReport } from "./types";
import {
  runBootAudit,
  runDryScan,
  runFullSweep,
  runIncrementalSweep,
  getCachedReport as getOrchestratedReport,
  startScheduledSweeps,
  stopScheduledSweeps,
  getOrchestratorStatus,
  getSweepCount,
  getLastFullSweep,
  getLastIncrementalSweep,
} from "./execution-orchestrator";

let lastRunTimestamp: string | null = null;

export function runFullAudit(): FullAuditReport {
  const report = runBootAudit();
  lastRunTimestamp = report.summary.timestamp;

  startScheduledSweeps(10);

  return report;
}

export { runDryScan, runFullSweep, runIncrementalSweep, startScheduledSweeps, stopScheduledSweeps };

export function getCachedReport(): FullAuditReport | null {
  return getOrchestratedReport();
}

export function getLastRunTimestamp(): string | null {
  return lastRunTimestamp ?? getLastFullSweep() ?? getLastIncrementalSweep();
}

export function getEngineStatus() {
  return getOrchestratorStatus();
}

export function getTotalSweepCount(): number {
  return getSweepCount();
}
