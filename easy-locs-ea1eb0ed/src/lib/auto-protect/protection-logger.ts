import { scrubSensitiveData } from "@/lib/observability/sentry-helpers";
import type { DetectedIssue, ProtectionReaction, ProtectionReport } from "./types";

const MAX_LOG_SIZE = 500;

const protectionLog: ProtectionReport[] = [];

let _sentry: typeof import("@sentry/react") | null = null;
async function getSentry() {
  if (!_sentry) _sentry = await import("@sentry/react");
  return _sentry;
}

export function logProtectionCycle(report: ProtectionReport): void {
  protectionLog.push(report);
  if (protectionLog.length > MAX_LOG_SIZE) {
    protectionLog.splice(0, protectionLog.length - MAX_LOG_SIZE);
  }

  const severityMap: Record<string, string> = {
    critical: "fatal",
    high: "error",
    medium: "warning",
  };
  const level = (severityMap[report.issue.severity] || "info") as import("@sentry/react").SeverityLevel;

  const safeMetadata = scrubSensitiveData({
    issueId: report.issue.id,
    entityId: report.issue.entityId || "none",
    action: report.reaction.action,
    details: report.reaction.details,
    remainingRisk: report.reaction.remainingRisk,
    verificationResult: report.reaction.verificationResult || "pending",
    domain: report.issue.domain,
    cycle: report.cycle,
  });

  getSentry().then((Sentry) => {
    Sentry.withScope((scope) => {
      scope.setTag("domain", report.issue.domain);
      scope.setTag("protection.action", report.reaction.action);
      scope.setTag("protection.severity", report.issue.severity);
      scope.setTag("protection.category", report.issue.category);
      scope.setTag("protection.autoFixed", String(report.reaction.autoFixed));
      scope.setTag("protection.verified", String(report.reaction.verified));
      scope.setLevel(level);
      scope.setExtras(safeMetadata);

      if (report.issue.severity === "critical" || report.issue.severity === "high") {
        Sentry.captureMessage(
          `[PROTECTION] ${report.reaction.action.toUpperCase()} — ${report.issue.domain}.${report.issue.category}: ${report.issue.message}`,
        );
      } else {
        Sentry.addBreadcrumb({
          category: `protection.${report.issue.domain}`,
          message: `${report.reaction.action}: ${report.issue.message}`,
          data: safeMetadata,
          level,
        });
      }
    });
  });

  if (import.meta.env.DEV) {
    const prefix = report.reaction.autoFixed ? "AUTO-FIXED" : report.reaction.action.toUpperCase();
    console.info(
      `[PROTECTION][${prefix}] ${report.issue.domain}.${report.issue.category}: ${report.issue.message} → ${report.reaction.details}`,
    );
  }
}

export function getProtectionLog(limit = 50): ProtectionReport[] {
  return protectionLog.slice(-limit);
}

export function getProtectionStats(windowMs = 300_000) {
  const now = Date.now();
  const cutoff = new Date(now - windowMs).toISOString();
  const recent = protectionLog.filter((r) => r.issue.detectedAt > cutoff);

  const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
  const byAction: Record<string, number> = {};
  const byDomain: Record<string, number> = {};

  for (const r of recent) {
    bySeverity[r.issue.severity]++;
    byAction[r.reaction.action] = (byAction[r.reaction.action] || 0) + 1;
    byDomain[r.issue.domain] = (byDomain[r.issue.domain] || 0) + 1;
  }

  const autoFixedCount = recent.filter((r) => r.reaction.autoFixed).length;
  const verifiedCount = recent.filter((r) => r.reaction.verified).length;

  return {
    total: recent.length,
    bySeverity,
    byAction,
    byDomain,
    autoFixedCount,
    verifiedCount,
    healthStatus:
      bySeverity.critical > 3 ? "critical" as const :
      bySeverity.critical > 0 || bySeverity.high > 5 ? "degraded" as const :
      "healthy" as const,
  };
}

export function clearProtectionLog(): void {
  protectionLog.length = 0;
}
