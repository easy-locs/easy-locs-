import type { FullAuditReport } from "./types";
import { clearQuarantine, getQuarantineCount } from "./quarantine";
import { buildSourceInventory } from "./source-inventory";
import { auditAllEntities, resetAuditState } from "./entity-auditor";
import { generateFullReport } from "./audit-report";
import { rebuildSearchIndex } from "@/lib/intent/search-index-populator";

let cachedReport: FullAuditReport | null = null;
let lastRunTimestamp: string | null = null;

export function runFullAudit(): FullAuditReport {
  clearQuarantine();
  resetAuditState();

  const sources = buildSourceInventory();
  const { findings, remediations } = auditAllEntities();
  const report = generateFullReport(findings, remediations, sources);

  cachedReport = report;
  lastRunTimestamp = report.summary.timestamp;

  if (getQuarantineCount() > 0) {
    rebuildSearchIndex();
  }

  if (import.meta.env.DEV) {
    const s = report.summary;
    console.log(
      `[data-quality] Audit complete — ${s.totalEntities} entities, ` +
      `${s.byClassification["VALID"] ?? 0} valid, ` +
      `${s.quarantined} quarantined, ` +
      `${s.autoFixed} auto-fixed, ` +
      `${s.duplicatesFound} duplicates, ` +
      `${s.orphansFound} orphans, ` +
      `${s.crossVerticalCount} cross-vertical, ` +
      `${s.brokenMediaCount} broken media`
    );
  }

  return report;
}

export function getCachedReport(): FullAuditReport | null {
  return cachedReport;
}

export function getLastRunTimestamp(): string | null {
  return lastRunTimestamp;
}
