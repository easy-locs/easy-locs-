/**
 * audit-repository — DB operations for audit reports.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchAuditReport(reportId: string) {
  const [{ data: report }, { data: findings }, { data: gates }] = await Promise.all([
    (supabase as any).from("audit_reports").select("*").eq("id", reportId).maybeSingle(),
    (supabase as any).from("audit_findings").select("*").eq("report_id", reportId).order("created_at", { ascending: true }),
    (supabase as any).from("launch_gate_results").select("*").eq("report_id", reportId).order("created_at", { ascending: true }),
  ]);
  return { report: report ?? null, findings: findings ?? [], gates: gates ?? [] };
}
