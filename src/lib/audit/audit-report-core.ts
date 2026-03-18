import { supabase } from "@/integrations/supabase/client";

export async function createAuditReport(params: {
  workspaceId?: string;
  reportType?: "system" | "business" | "security" | "launch_gate";
  summary?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from("audit_reports")
    .insert({
      workspace_id: params.workspaceId ?? null,
      report_type: params.reportType ?? "system",
      status: "running",
      summary: params.summary ?? null,
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addAuditFinding(params: {
  reportId: string;
  findingKey: string;
  findingGroup: string;
  severity: "critical" | "warning" | "info";
  scoreImpact: number;
  title: string;
  details?: string;
  expectedState?: string;
  actualState?: string;
  actionHint?: string;
}) {
  const { data, error } = await (supabase as any)
    .from("audit_findings")
    .insert({
      report_id: params.reportId,
      finding_key: params.findingKey,
      finding_group: params.findingGroup,
      severity: params.severity,
      score_impact: params.scoreImpact,
      title: params.title,
      details: params.details ?? null,
      expected_state: params.expectedState ?? null,
      actual_state: params.actualState ?? null,
      action_hint: params.actionHint ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addLaunchGateResult(params: {
  workspaceId?: string;
  reportId: string;
  gateKey: string;
  status: "pass" | "fail" | "warning" | "unknown";
  details?: Record<string, any>;
}) {
  const { data, error } = await (supabase as any)
    .from("launch_gate_results")
    .insert({
      workspace_id: params.workspaceId ?? null,
      report_id: params.reportId,
      gate_key: params.gateKey,
      status: params.status,
      details: params.details ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function finalizeAuditReport(reportId: string) {
  const { data: findings, error: findingsError } = await (supabase as any)
    .from("audit_findings")
    .select("*")
    .eq("report_id", reportId);

  if (findingsError) throw findingsError;

  const criticalCount = (findings ?? []).filter((f: any) => f.severity === "critical").length;
  const warningCount = (findings ?? []).filter((f: any) => f.severity === "warning").length;
  const infoCount = (findings ?? []).filter((f: any) => f.severity === "info").length;

  const totalPenalty = (findings ?? []).reduce(
    (sum: number, row: any) => sum + Number(row.score_impact ?? 0),
    0
  );

  const totalScore = Math.max(0, Number((100 - totalPenalty).toFixed(2)));

  const status =
    criticalCount > 0 ? "failed" : warningCount > 0 ? "partial" : "passed";

  const { data, error } = await (supabase as any)
    .from("audit_reports")
    .update({
      status,
      total_score: totalScore,
      critical_count: criticalCount,
      warning_count: warningCount,
      info_count: infoCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
