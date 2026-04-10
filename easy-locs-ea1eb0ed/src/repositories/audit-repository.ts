/**
 * audit-repository — DB operations for audit reports.
 */
import { db } from "@/services/db";

export async function fetchAuditReport(reportId: string) {
  const [{ data: report }, { data: findings }, { data: gates }] = await Promise.all([
    db("audit_reports").select("*").eq("id", reportId).maybeSingle(),
    db("audit_findings").select("*").eq("report_id", reportId).order("created_at", { ascending: true }),
    db("launch_gate_results").select("*").eq("report_id", reportId).order("created_at", { ascending: true }),
  ]);
  return { report: report ?? null, findings: findings ?? [], gates: gates ?? [] };
}
