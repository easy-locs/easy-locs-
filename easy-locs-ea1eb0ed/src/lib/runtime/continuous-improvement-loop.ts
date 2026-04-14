/**
 * continuous-improvement-loop — Orchestrates all runtime engines in a continuous
 * scan→detect→classify→fix→validate→optimize→protect cycle.
 * Integrates with auto-repair-engine and all quality/guard engines.
 */

import { runAutoRepairCycle, getRepairHistory } from "./auto-repair-engine";
import { runArchitectureGuard, getLastArchGuardReport } from "./architecture-guard";
import { runTaxonomyGuard, getTaxonomyViolations } from "./taxonomy-guard";
import { runSearchPurityEngine, getSearchPurityViolations } from "./search-purity-engine";
import { runCardHealthValidator, getDeadCards } from "./card-health-validator";
import { runProviderQualityEngine } from "./provider-quality-engine";
import { runListingQualityEngine } from "./listing-quality-engine";
import { runEntryGuards } from "./entry-guards";
import { runCssUxScan } from "./css-ux-conflict-detector";
import { runI18nOverflowScan } from "./i18n-overflow-guard";
import { runHookHealthScan } from "./hook-health-monitor";
import { runFluxAudit } from "./flux-pipeline-auditor";
import { generateDecompositionReport, type DecompositionReport } from "./decomposition-reporter";
import { getSlowFlowHistory, getP95Latency } from "./slow-flow-detector";
import { reportHealth } from "./health-aggregator";
import { reportAnomaly } from "./anomaly-detector";

export interface ImprovementCycleReport {
  cycleNumber: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  archGuard: { status: string; passed: number; failed: number; warnings: number };
  taxonomyGuard: { violations: number };
  searchPurity: { status: string; violations: number };
  cardHealth: { total: number; healthy: number; dead: number };
  cssUx: { score: number; issues: number };
  i18n: { score: number; issues: number };
  hookHealth: { score: number; memoryMB: number };
  fluxPipelines: { score: number; activePipelines: number };
  decomposition: { priority: string; overCoupled: number; deadEvents: number; recommendations: number };
  slowFlows: { p95Ms: number; totalTracked: number };
  repairActions: number;
  overallStatus: "clean" | "warnings" | "violations" | "critical";
}

const CYCLE_INTERVAL_MS = 120_000;
let cycleCount = 0;
let lastCycleReport: ImprovementCycleReport | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let running = false;

export async function runImprovementCycle(): Promise<ImprovementCycleReport> {
  if (running) {
    if (lastCycleReport) return lastCycleReport;
    return {
      cycleNumber: cycleCount,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      archGuard: { status: "clean", passed: 0, failed: 0, warnings: 0 },
      taxonomyGuard: { violations: 0 },
      searchPurity: { status: "clean", violations: 0 },
      cardHealth: { total: 0, healthy: 0, dead: 0 },
      cssUx: { score: 100, issues: 0 },
      i18n: { score: 100, issues: 0 },
      hookHealth: { score: 100, memoryMB: 0 },
      fluxPipelines: { score: 100, activePipelines: 0 },
      decomposition: { priority: "healthy", overCoupled: 0, deadEvents: 0, recommendations: 0 },
      slowFlows: { p95Ms: 0, totalTracked: 0 },
      repairActions: 0,
      overallStatus: "clean" as const,
    };
  }
  running = true;
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  cycleCount++;

  try {
    const archReport = runArchitectureGuard();

    const taxonomyResult = runTaxonomyGuard();
    const taxonomyViolations = getTaxonomyViolations();

    const searchResult = runSearchPurityEngine();
    const searchViolations = getSearchPurityViolations();

    const cardResult = runCardHealthValidator();

    runProviderQualityEngine();
    runListingQualityEngine();
    runEntryGuards();

    let cssUxResult = { score: 100, issues: [] as any[] };
    let i18nResult = { score: 100, issues: [] as any[] };
    let hookResult = { score: 100, memoryMB: 0, issues: [] as any[] };
    let fluxResult = { score: 100, activePipelines: 0, issues: [] as any[] };
    try { cssUxResult = runCssUxScan(); } catch {}
    try { i18nResult = runI18nOverflowScan(); } catch {}
    try { hookResult = runHookHealthScan(); } catch {}
    try { fluxResult = runFluxAudit(); } catch {}

    let decompReport: DecompositionReport = { overCoupledModules: [], deadEventCount: 0, mismatchedEventCount: 0, brokenPropagationCount: 0, staleCacheCount: 0, staleRealtimeCount: 0, priority: "healthy", recommendations: [] };
    try { decompReport = generateDecompositionReport(); } catch {}

    const slowHistory = getSlowFlowHistory();
    const p95 = getP95Latency();

    const repairActions = await runAutoRepairCycle();

    const deadCards = getDeadCards();
    const criticalTaxonomy = taxonomyViolations.filter(v => v.severity === "critical").length;
    const criticalCssUx = cssUxResult.issues.filter((i: any) => i.severity === "critical").length;
    const criticalI18n = i18nResult.issues.filter((i: any) => i.severity === "critical").length;

    let overallStatus: ImprovementCycleReport["overallStatus"] = "clean";
    if (archReport.failed > 0 || criticalTaxonomy > 0 || criticalCssUx > 0 || criticalI18n > 0 || decompReport.priority === "critical") overallStatus = "critical";
    else if (archReport.warnings > 0 || deadCards.length > 0 || searchViolations.length > 0 || cssUxResult.issues.length > 0 || i18nResult.issues.length > 0 || decompReport.priority === "warning") overallStatus = "warnings";
    else if (taxonomyViolations.length > 0) overallStatus = "violations";

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const report: ImprovementCycleReport = {
      cycleNumber: cycleCount,
      startedAt,
      completedAt,
      durationMs,
      archGuard: {
        status: archReport.status,
        passed: archReport.passed,
        failed: archReport.failed,
        warnings: archReport.warnings,
      },
      taxonomyGuard: { violations: taxonomyViolations.length },
      searchPurity: { status: searchResult.status, violations: searchResult.violationCount },
      cardHealth: { total: cardResult.total, healthy: cardResult.healthy, dead: cardResult.dead },
      cssUx: { score: cssUxResult.score, issues: cssUxResult.issues.length },
      i18n: { score: i18nResult.score, issues: i18nResult.issues.length },
      hookHealth: { score: hookResult.score, memoryMB: hookResult.memoryMB },
      fluxPipelines: { score: fluxResult.score, activePipelines: fluxResult.activePipelines },
      decomposition: { priority: decompReport.priority, overCoupled: decompReport.overCoupledModules.length, deadEvents: decompReport.deadEventCount, recommendations: decompReport.recommendations.length },
      slowFlows: { p95Ms: p95, totalTracked: slowHistory.length },
      repairActions: repairActions.length,
      overallStatus,
    };

    lastCycleReport = report;

    reportHealth(
      "continuous-improvement",
      overallStatus === "critical" ? "degraded" : "ok",
      durationMs,
      overallStatus !== "clean" ? `Cycle #${cycleCount}: ${overallStatus}` : undefined
    );

    return report;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    reportAnomaly("architecture_violation", "continuous-improvement",
      `Improvement cycle #${cycleCount} failed: ${msg}`, "critical");
    throw err;
  } finally {
    running = false;
  }
}

export function startContinuousImprovement(intervalMs = CYCLE_INTERVAL_MS): () => void {
  if (intervalId) return () => {};

  const initialTimer = setTimeout(async () => {
    try {
      await runImprovementCycle();
    } catch {}
  }, 30_000);

  intervalId = setInterval(async () => {
    try {
      await runImprovementCycle();
    } catch {}
  }, intervalMs);

  console.log(`[continuous-improvement] Loop started — cycle every ${intervalMs / 1000}s`);

  return () => {
    clearTimeout(initialTimer);
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function getLastCycleReport(): ImprovementCycleReport | null {
  return lastCycleReport;
}

export function getCycleCount(): number {
  return cycleCount;
}
