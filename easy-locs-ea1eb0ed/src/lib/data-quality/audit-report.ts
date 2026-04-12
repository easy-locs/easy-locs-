import type {
  AuditSummary,
  EntityClassification,
  EntityFinding,
  FullAuditReport,
  IssueSeverity,
  IssueCategory,
  RemediationEntry,
  DataSource,
} from "./types";
import { getQuarantineList } from "./quarantine";

export function generateAuditSummary(
  findings: EntityFinding[],
  remediations: RemediationEntry[],
  sources: DataSource[]
): AuditSummary {
  const byClassification = {} as Record<EntityClassification, number>;
  const byVertical: Record<string, { total: number; valid: number; issues: number }> = {};
  const bySource: Record<string, { total: number; valid: number; issues: number }> = {};
  const byIssueSeverity = {} as Record<IssueSeverity, number>;
  const byIssueCategory = {} as Record<IssueCategory, number>;

  for (const f of findings) {
    byClassification[f.classification] = (byClassification[f.classification] ?? 0) + 1;

    if (!byVertical[f.vertical]) byVertical[f.vertical] = { total: 0, valid: 0, issues: 0 };
    byVertical[f.vertical].total++;
    if (f.classification === "VALID") byVertical[f.vertical].valid++;
    else byVertical[f.vertical].issues++;

    if (!bySource[f.source]) bySource[f.source] = { total: 0, valid: 0, issues: 0 };
    bySource[f.source].total++;
    if (f.classification === "VALID") bySource[f.source].valid++;
    else bySource[f.source].issues++;

    for (const issue of f.issues) {
      byIssueSeverity[issue.severity] = (byIssueSeverity[issue.severity] ?? 0) + 1;
      byIssueCategory[issue.category] = (byIssueCategory[issue.category] ?? 0) + 1;
    }
  }

  const quarantine = getQuarantineList();

  return {
    totalEntities: findings.length,
    totalSources: sources.length,
    byClassification,
    byVertical,
    bySource,
    byIssueSeverity,
    byIssueCategory,
    quarantined: quarantine.length,
    autoFixed: remediations.filter((r) => r.action === "auto_fixed").length,
    reviewNeeded: remediations.filter((r) => r.action === "review_needed").length,
    duplicatesFound: (byClassification["DUPLICATE"] ?? 0),
    orphansFound: (byClassification["ORPHAN"] ?? 0),
    crossVerticalCount: (byClassification["CROSS_VERTICAL_CONTAMINATION"] ?? 0),
    brokenMediaCount: (byClassification["BROKEN_MEDIA"] ?? 0),
    timestamp: new Date().toISOString(),
  };
}

export function generateFullReport(
  findings: EntityFinding[],
  remediations: RemediationEntry[],
  sources: DataSource[]
): FullAuditReport {
  return {
    summary: generateAuditSummary(findings, remediations, sources),
    sources,
    findings,
    remediations,
    quarantine: [...getQuarantineList()],
  };
}
