import type { ExecutionMode, SweepCadence, EngineRunLog, FullAuditReport } from "./types";
import { engineRegistry } from "./engine-registry";
import { clearQuarantine, getQuarantineCount } from "./quarantine";
import { buildSourceInventory } from "./source-inventory";
import { generateFullReport } from "./audit-report";
import { rebuildSearchIndex } from "@/lib/intent/search-index-populator";
import { resetSurfaceSuppressions } from "./engines/live-surface-sanitizer-engine";
import { resetSearchState } from "./engines/search-hygiene-engine";
import { filterForSurface, filterForSearch } from "./surface-protector";
export { filterForSurface, filterForSearch };
import { auditAllEntities } from "./entity-auditor";
export { auditAllEntities };
import {
  acquireSweepLock,
  releaseSweepLock,
  shouldSkipIncrementalSweep,
} from "@/lib/runtime/runtime-safety";
import {
  TaxonomyIntegrityEngine,
  MediaRelevanceEngine,
  DuplicateShadowEngine,
  ReferenceIntegrityEngine,
  DataQualityScoringEngine,
  LiveSurfaceSanitizerEngine,
  SafeRemediationEngine,
  QuarantineEngine,
  SearchHygieneEngine,
  AuditTrailEngine,
} from "./engines";

let initialized = false;
let lastFullSweep: string | null = null;
let lastIncrementalSweep: string | null = null;
let cachedReport: FullAuditReport | null = null;
let sweepCount = 0;
let scheduledInterval: ReturnType<typeof setInterval> | null = null;

function ensureEnginesRegistered(): void {
  if (initialized) return;
  initialized = true;

  engineRegistry.register(new TaxonomyIntegrityEngine());
  engineRegistry.register(new MediaRelevanceEngine());
  engineRegistry.register(new DuplicateShadowEngine());
  engineRegistry.register(new ReferenceIntegrityEngine());
  engineRegistry.register(new DataQualityScoringEngine());
  engineRegistry.register(new LiveSurfaceSanitizerEngine());
  engineRegistry.register(new SafeRemediationEngine());
  engineRegistry.register(new QuarantineEngine());
  engineRegistry.register(new SearchHygieneEngine());
  engineRegistry.register(new AuditTrailEngine());
}

export function runOrchestrated(mode: ExecutionMode, cadence: SweepCadence = "manual"): FullAuditReport {
  ensureEnginesRegistered();

  if (!acquireSweepLock()) {
    if (import.meta.env.DEV) {
      console.warn(`[data-quality] Sweep blocked (lock/cooldown/circuit) — mode=${mode} cadence=${cadence}`);
    }
    if (cachedReport) return cachedReport;
    return generateFullReport([], [], buildSourceInventory());
  }

  const startMs = performance.now();
  let success = false;

  try {
    if (mode === "FULL_SWEEP" || mode === "DRY_RUN") {
      clearQuarantine();
      resetSurfaceSuppressions();
      resetSearchState();
      for (const engine of engineRegistry.getAll()) {
        engine.resetFindingDedup();
      }
    }

    const engineLogs = engineRegistry.runAll(mode, cadence);

    const sources = buildSourceInventory();
    const allFindings = engineRegistry.getAllFindings();
    const allRemediations = engineRegistry.getAllRemediations();

    const report = generateFullReport(allFindings, allRemediations, sources);
    report.engineRuns = engineLogs;
    report.summary.executionMode = mode;
    report.summary.engineRunSummaries = engineRegistry.getSummaries();

    cachedReport = report;

    if (cadence === "scheduled" || cadence === "manual") {
      lastFullSweep = new Date().toISOString();
    } else {
      lastIncrementalSweep = new Date().toISOString();
    }

    sweepCount++;
    success = true;

    if (mode !== "DRY_RUN" && getQuarantineCount() > 0) {
      try {
        rebuildSearchIndex();
      } catch {}
    }

    if (mode === "FULL_SWEEP") {
      try {
        const auditResult = auditAllEntities();
        const safeEntities = filterForSurface(allFindings.map(f => ({ id: f.entityId, ...f })));
        const searchSafe = filterForSearch(allFindings.map(f => ({ id: f.entityId, ...f })));
        if (import.meta.env.DEV) {
          console.log(
            `[data-quality] Post-sweep: ${auditResult.findings.length} entity findings, ${auditResult.remediations.length} remediations, ` +
            `${safeEntities.length}/${allFindings.length} surface-safe, ${searchSafe.length} search-safe`
          );
        }
      } catch {}
    }

    if (import.meta.env.DEV) {
      const s = report.summary;
      const durationMs = Math.round(performance.now() - startMs);
      console.log(
        `[data-quality] Engine sweep #${sweepCount} (${mode}/${cadence}) — ` +
        `${s.totalEntities} entities, ${s.byClassification["VALID"] ?? 0} valid, ` +
        `${s.quarantined} quarantined, ${s.autoFixed} auto-fixed, ` +
        `${engineLogs.length} engines ran (${durationMs}ms)`
      );
    }

    return report;
  } finally {
    const durationMs = Math.round(performance.now() - startMs);
    releaseSweepLock(cachedReport, durationMs, success);
  }
}

export function runDryScan(): FullAuditReport {
  return runOrchestrated("DRY_RUN", "manual");
}

export function runIncrementalSweep(): FullAuditReport {
  if (shouldSkipIncrementalSweep()) {
    if (import.meta.env.DEV) {
      console.debug("[data-quality] Incremental sweep skipped (cooldown/in-progress/circuit)");
    }
    if (cachedReport) return cachedReport;
    return generateFullReport([], [], buildSourceInventory());
  }
  return runOrchestrated("INCREMENTAL", "incremental");
}

export function runFullSweep(): FullAuditReport {
  return runOrchestrated("FULL_SWEEP", "scheduled");
}

export function runBootAudit(): FullAuditReport {
  return runOrchestrated("SAFE_AUTO", "boot");
}

export function startScheduledSweeps(intervalMinutes: number = 10): void {
  if (scheduledInterval) return;

  scheduledInterval = setInterval(() => {
    try {
      if (shouldSkipIncrementalSweep()) {
        if (import.meta.env.DEV) {
          console.debug("[data-quality] Scheduled sweep skipped (safety check)");
        }
        return;
      }
      runOrchestrated("SAFE_AUTO", "scheduled");
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[data-quality] Scheduled sweep error:", err);
      }
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopScheduledSweeps(): void {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
    scheduledInterval = null;
  }
}

export function getCachedReport(): FullAuditReport | null {
  return cachedReport;
}

export function getLastFullSweep(): string | null {
  return lastFullSweep;
}

export function getLastIncrementalSweep(): string | null {
  return lastIncrementalSweep;
}

export function getSweepCount(): number {
  return sweepCount;
}

export function getOrchestratorStatus() {
  return {
    initialized,
    sweepCount,
    lastFullSweep,
    lastIncrementalSweep,
    scheduledActive: scheduledInterval !== null,
    engineCount: engineRegistry.getNames().length,
    engineNames: engineRegistry.getNames(),
    engineSummaries: initialized ? engineRegistry.getSummaries() : [],
    runHistory: engineRegistry.getRunHistory().slice(-20),
  };
}
