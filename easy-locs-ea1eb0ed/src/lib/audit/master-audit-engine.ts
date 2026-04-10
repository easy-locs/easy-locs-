import {
  createAuditReport,
  addAuditFinding,
  finalizeAuditReport,
} from "@/lib/audit/audit-report-core";
import {
  auditAuthChecks,
  auditRealtimeChecks,
  auditRlsChecks,
  auditRouteConfigChecks,
  auditMobileChecks,
} from "@/lib/audit/checks-core";
import {
  auditPaymentChecks,
  auditDispatchChecks,
  auditTrackingChecks,
  auditDataChecks,
  auditBusinessChecks,
} from "@/lib/audit/checks-business";
import { evaluateLaunchGates } from "@/lib/audit/launch-gates";

export async function runMasterAudit(workspaceId?: string) {
  const report = await createAuditReport({
    workspaceId,
    reportType: "launch_gate",
    summary: "Master audit engine V2",
  });

  const groups = await Promise.all([
    auditAuthChecks(),
    auditRealtimeChecks(),
    auditRlsChecks(),
    auditRouteConfigChecks(),
    auditMobileChecks(),
    auditPaymentChecks(workspaceId),
    auditDispatchChecks(workspaceId),
    auditTrackingChecks(workspaceId),
    auditDataChecks(workspaceId),
    auditBusinessChecks(workspaceId),
  ]);

  const findings = groups.flat();

  for (const row of findings) {
    await addAuditFinding({
      reportId: report.id,
      findingKey: row.key,
      findingGroup: row.group,
      severity: row.severity as any,
      scoreImpact: row.impact,
      title: row.title,
      expectedState: row.expected,
      actualState: row.actual,
      actionHint: row.hint,
      details: row.ok ? "OK" : "Needs attention",
    });
  }

  await evaluateLaunchGates({ workspaceId, reportId: report.id });

  return finalizeAuditReport(report.id);
}
