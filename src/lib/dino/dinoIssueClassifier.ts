/**
 * DINO Issue Classifier — Classifies detected issues by severity, type, and fixability.
 */

import type { DesignAuditFinding, AuditFindingSeverity, AuditFindingType, AuditFixability } from "@/lib/design/pageAudit";

export interface ClassifiedIssue {
  finding: DesignAuditFinding;
  priority: number; // 1-100, higher = more urgent
  category: "visual" | "functional" | "content" | "routing" | "i18n" | "performance" | "stability";
  autoFixSafe: boolean;
}

const SEVERITY_PRIORITY: Record<AuditFindingSeverity, number> = {
  critical: 90,
  major: 60,
  minor: 30,
};

const TYPE_CATEGORY_MAP: Record<AuditFindingType, ClassifiedIssue["category"]> = {
  layout: "visual",
  spacing: "visual",
  typography: "content",
  branding: "visual",
  form: "visual",
  image: "visual",
  responsive: "visual",
  i18n: "i18n",
  stability: "performance",
  routing: "routing",
  interaction: "functional",
};

const AUTO_FIX_SAFE_TYPES: Set<AuditFixability> = new Set(["auto"]);

/**
 * Classify a batch of findings into prioritized issues.
 */
export function classifyFindings(findings: DesignAuditFinding[]): ClassifiedIssue[] {
  return findings
    .map(f => ({
      finding: f,
      priority: SEVERITY_PRIORITY[f.severity] + (f.fixability === "auto" ? 5 : 0),
      category: TYPE_CATEGORY_MAP[f.type] || ("visual" as const),
      autoFixSafe: AUTO_FIX_SAFE_TYPES.has(f.fixability),
    }))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Group classified issues by category.
 */
export function groupByCategory(issues: ClassifiedIssue[]): Record<string, ClassifiedIssue[]> {
  const groups: Record<string, ClassifiedIssue[]> = {};
  for (const issue of issues) {
    if (!groups[issue.category]) groups[issue.category] = [];
    groups[issue.category].push(issue);
  }
  return groups;
}

/**
 * Summary stats for a set of classified issues.
 */
export function issueSummary(issues: ClassifiedIssue[]): {
  total: number;
  critical: number;
  major: number;
  minor: number;
  autoFixable: number;
  patchRequired: number;
  manualRequired: number;
} {
  return {
    total: issues.length,
    critical: issues.filter(i => i.finding.severity === "critical").length,
    major: issues.filter(i => i.finding.severity === "major").length,
    minor: issues.filter(i => i.finding.severity === "minor").length,
    autoFixable: issues.filter(i => i.autoFixSafe).length,
    patchRequired: issues.filter(i => i.finding.fixability === "patch").length,
    manualRequired: issues.filter(i => i.finding.fixability === "manual").length,
  };
}
