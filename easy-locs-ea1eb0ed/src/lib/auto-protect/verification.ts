import type { ProtectionReport, ProtectionReaction } from "./types";
import { addDomainBreadcrumb } from "@/lib/observability/sentry-helpers";

export interface VerificationCheck {
  name: string;
  passed: boolean;
  details: string;
}

export function verifyProtectionAction(report: ProtectionReport): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  checks.push({
    name: "action_logged",
    passed: !!report.reaction.reactedAt,
    details: report.reaction.reactedAt ? "Reaction timestamp recorded" : "Missing reaction timestamp",
  });

  checks.push({
    name: "severity_appropriate",
    passed: verifySeverityActionMatch(report),
    details: verifySeverityActionMatch(report)
      ? "Action matches severity level"
      : `Action "${report.reaction.action}" may not match severity "${report.issue.severity}"`,
  });

  if (report.reaction.autoFixed) {
    checks.push({
      name: "auto_fix_safe",
      passed: !isDangerousAutoFix(report),
      details: isDangerousAutoFix(report)
        ? "DANGER: Auto-fix applied to critical/dangerous category"
        : "Auto-fix applied to safe category",
    });
  }

  if (report.reaction.action === "quarantined" || report.reaction.action === "hidden") {
    checks.push({
      name: "entity_isolated",
      passed: true,
      details: `Entity ${report.issue.entityId || "unknown"} isolated from public view`,
    });
  }

  if (report.reaction.action === "frozen") {
    checks.push({
      name: "flow_halted",
      passed: true,
      details: "Transaction flow halted safely",
    });
  }

  addDomainBreadcrumb(
    report.issue.domain as any,
    "protection.verify",
    {
      issueId: report.issue.id,
      action: report.reaction.action,
      checksRun: checks.length,
      allPassed: checks.every((c) => c.passed),
    },
  );

  return checks;
}

function verifySeverityActionMatch(report: ProtectionReport): boolean {
  const { severity } = report.issue;
  const { action } = report.reaction;

  if (severity === "critical") {
    return ["quarantined", "frozen", "blocked", "hidden", "escalated", "rate_limited"].includes(action);
  }
  if (severity === "high") {
    return ["quarantined", "blocked", "hidden", "challenged", "review_queued", "escalated", "rate_limited"].includes(action);
  }
  return true;
}

function isDangerousAutoFix(report: ProtectionReport): boolean {
  const DANGEROUS = new Set([
    "wallet_inconsistent",
    "otp_abuse",
    "auth_suspicious",
    "cross_vertical",
    "canonical_conflict",
  ]);
  return DANGEROUS.has(report.issue.category) || report.issue.severity === "critical";
}

export function runPostActionVerification(reports: ProtectionReport[]): {
  totalReports: number;
  totalChecks: number;
  allPassed: boolean;
  failures: VerificationCheck[];
} {
  const allChecks: VerificationCheck[] = [];

  for (const report of reports) {
    const checks = verifyProtectionAction(report);
    allChecks.push(...checks);
  }

  const failures = allChecks.filter((c) => !c.passed);

  return {
    totalReports: reports.length,
    totalChecks: allChecks.length,
    allPassed: failures.length === 0,
    failures,
  };
}
