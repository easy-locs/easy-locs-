import { runFullDedupSweep, getDedupSummary, type FullDedupRunResult } from "@/lib/dedup/entity-dedup-runner";
import { runMappingCorrection, getMappingCorrectionSummary, type MappingCorrectionResult, type MappingEntity } from "@/services/validation/mapping-corrector";
import { scanForOrphans, getOrphanCleanupSummary, type OrphanScanResult, type MediaAssetRecord } from "@/lib/cleanup/orphan-asset-cleaner";
import { runE2EFlowVerification, getE2EVerificationSummary, type E2EVerificationReport } from "@/lib/flows/e2e-flow-verifier";
import { runResilienceTestSuite, getResilienceReportSummary, type ResilienceReport } from "@/lib/stress/resilience-test-suite";
import { recordAction } from "@/lib/control-plane/domain-health";

export interface LockdownInput {
  entitySets: Record<string, Record<string, unknown>[]>;
  mappingEntities: MappingEntity[];
  mediaAssets: MediaAssetRecord[];
  entityIdIndex: Set<string>;
}

export interface LockdownRunArtifact {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;

  dedupResult: FullDedupRunResult;
  mappingResult: MappingCorrectionResult;
  orphanResult: OrphanScanResult;
  e2eResult: E2EVerificationReport;
  resilienceResult: ResilienceReport;

  mergedEntityIds: string[];
  removedEntityIds: string[];
  correctedEntityIds: string[];
  quarantinedEntityIds: string[];
  orphanAssetIds: string[];

  overallPassed: boolean;
  failureReasons: string[];
  summary: string;
}

function generateRunId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `lockdown-${ts}-${rand}`;
}

export function runProductionLockdown(input: LockdownInput): LockdownRunArtifact {
  const runId = generateRunId();
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const failureReasons: string[] = [];

  recordAction("orbit", "lockdown_started", true);

  const dedupResult = runFullDedupSweep(input.entitySets);

  const allRemovedIds: string[] = [];
  const allMergedIds: string[] = [];
  for (const er of dedupResult.entityResults) {
    allRemovedIds.push(...er.removedIds);
    for (const log of er.logs) {
      if (log.action === "merged") {
        allMergedIds.push(...log.mergedIds);
      }
    }
  }

  if (dedupResult.totalDuplicates > 0 && dedupResult.totalMerged === 0 && dedupResult.totalQuarantined === 0) {
    failureReasons.push(`Dedup found ${dedupResult.totalDuplicates} duplicates but merged/quarantined none`);
  }

  const mappingResult = runMappingCorrection(input.mappingEntities);

  const correctedEntityIds = mappingResult.correctedEntities.map(e => e.id);
  const quarantinedEntityIds = [...mappingResult.quarantinedEntityIds];

  const orphanResult = scanForOrphans(input.mediaAssets, input.entityIdIndex);

  const orphanAssetIds = [
    ...orphanResult.unreferencedImages.map(o => o.assetId),
    ...orphanResult.abandonedUploads.map(o => o.assetId),
    ...orphanResult.disconnectedMedia.map(o => o.assetId),
    ...orphanResult.brokenCdnRefs.map(o => o.assetId),
  ];

  const e2eResult = runE2EFlowVerification();
  if (e2eResult.failed > 0) {
    failureReasons.push(`${e2eResult.failed}/${e2eResult.totalFlows} E2E flows failed`);
  }
  if (e2eResult.deadButtonsTotal > 0) {
    failureReasons.push(`${e2eResult.deadButtonsTotal} dead buttons detected`);
  }
  if (e2eResult.illegalTransitionsTotal > 0) {
    failureReasons.push(`${e2eResult.illegalTransitionsTotal} illegal transitions detected`);
  }

  const resilienceResult = runResilienceTestSuite();
  if (resilienceResult.failed > 0) {
    failureReasons.push(`${resilienceResult.failed}/${resilienceResult.totalTests} resilience tests failed`);
  }

  const overallPassed = failureReasons.length === 0;

  recordAction("orbit", overallPassed ? "lockdown_passed" : "lockdown_failed", overallPassed, Date.now() - startTime);

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  const summaryLines = [
    `=== PRODUCTION LOCKDOWN RUN: ${runId} ===`,
    `Started: ${startedAt}`,
    `Completed: ${completedAt}`,
    `Duration: ${durationMs}ms`,
    `Overall: ${overallPassed ? "PASSED" : "FAILED"}`,
    ``,
    `--- Dedup ---`,
    `Scanned: ${dedupResult.totalScanned}`,
    `Duplicates: ${dedupResult.totalDuplicates}`,
    `Merged: ${dedupResult.totalMerged} | Removed: ${dedupResult.totalRemoved} | Survivors: ${dedupResult.totalSurvivors}`,
    ``,
    `--- Mapping Correction ---`,
    `Scanned: ${mappingResult.scanned}`,
    `Corrected: ${mappingResult.corrected} | Quarantined: ${mappingResult.quarantined} | Flagged: ${mappingResult.flagged}`,
    `Corrected entity IDs: [${correctedEntityIds.join(", ")}]`,
    `Quarantined entity IDs: [${quarantinedEntityIds.join(", ")}]`,
    ``,
    `--- Orphan Scan ---`,
    `Total assets: ${orphanResult.totalAssets}`,
    `Orphans found: ${orphanResult.totalOrphans}`,
    `Orphan asset IDs: [${orphanAssetIds.join(", ")}]`,
    `Cleaned bytes: ${orphanResult.totalCleanedBytes}`,
    ``,
    `--- E2E Flows ---`,
    `Total: ${e2eResult.totalFlows} | Passed: ${e2eResult.passed} | Failed: ${e2eResult.failed}`,
    `Dead buttons: ${e2eResult.deadButtonsTotal} | Illegal transitions: ${e2eResult.illegalTransitionsTotal} | Silent drops: ${e2eResult.silentDropsTotal}`,
    ``,
    `--- Resilience Tests ---`,
    `Total: ${resilienceResult.totalTests} | Passed: ${resilienceResult.passed} | Failed: ${resilienceResult.failed}`,
    ``,
  ];

  if (failureReasons.length > 0) {
    summaryLines.push(`--- FAILURE REASONS ---`);
    for (const reason of failureReasons) {
      summaryLines.push(`  - ${reason}`);
    }
  }

  return {
    runId,
    startedAt,
    completedAt,
    durationMs,
    dedupResult,
    mappingResult,
    orphanResult,
    e2eResult,
    resilienceResult,
    mergedEntityIds: allMergedIds,
    removedEntityIds: allRemovedIds,
    correctedEntityIds,
    quarantinedEntityIds,
    orphanAssetIds,
    overallPassed,
    failureReasons,
    summary: summaryLines.join("\n"),
  };
}

export function getLockdownDetailedReport(artifact: LockdownRunArtifact): string {
  const sections = [
    artifact.summary,
    "",
    "========================================",
    "DETAILED DEDUP REPORT",
    "========================================",
    getDedupSummary(artifact.dedupResult),
    "",
    "========================================",
    "DETAILED MAPPING CORRECTION REPORT",
    "========================================",
    getMappingCorrectionSummary(artifact.mappingResult),
    "",
    "========================================",
    "DETAILED ORPHAN SCAN REPORT",
    "========================================",
    getOrphanCleanupSummary(artifact.orphanResult),
    "",
    "========================================",
    "DETAILED E2E FLOW REPORT",
    "========================================",
    getE2EVerificationSummary(artifact.e2eResult),
    "",
    "========================================",
    "DETAILED RESILIENCE TEST REPORT",
    "========================================",
    getResilienceReportSummary(artifact.resilienceResult),
  ];

  return sections.join("\n");
}
