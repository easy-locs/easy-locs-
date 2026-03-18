import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuditReport(reportId?: string) {
  const [report, setReport] = useState<any | null>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);

  useEffect(() => {
    if (!reportId) return;
    let mounted = true;

    const load = async () => {
      const [{ data: reportData }, { data: findingsData }, { data: gatesData }] = await Promise.all([
        (supabase as any).from("audit_reports").select("*").eq("id", reportId).maybeSingle(),
        (supabase as any).from("audit_findings").select("*").eq("report_id", reportId).order("created_at", { ascending: true }),
        (supabase as any).from("launch_gate_results").select("*").eq("report_id", reportId).order("created_at", { ascending: true }),
      ]);

      if (!mounted) return;
      setReport(reportData ?? null);
      setFindings(findingsData ?? []);
      setGates(gatesData ?? []);
    };

    load();
    return () => { mounted = false; };
  }, [reportId]);

  return { report, findings, gates };
}
