import { runTextAudit, autoFixTextFindings, type TextAuditFinding } from "./textAudit";

export interface TextAuditSummary {
  total: number;
  fixed: number;
  byType: Record<string, number>;
  samples: Array<{
    type: TextAuditFinding["type"];
    text: string;
    message: string;
    tag: string;
  }>;
}

export function runTextAuditReport() {
  const findings = runTextAudit();
  const fixed = autoFixTextFindings(findings);
  const byType = findings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.type] = (acc[finding.type] ?? 0) + 1;
    return acc;
  }, {});

  const summary: TextAuditSummary = {
    total: findings.length,
    fixed,
    byType,
    samples: findings.slice(0, 12).map((finding) => ({
      type: finding.type,
      text: finding.text,
      message: finding.message,
      tag: finding.element.tagName.toLowerCase(),
    })),
  };

  return { findings, summary };
}
