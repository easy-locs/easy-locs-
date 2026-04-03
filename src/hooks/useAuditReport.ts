import { useEffect, useState } from "react";
import { fetchAuditReport } from "@/repositories/audit-repository";

export function useAuditReport(reportId?: string) {
  const [report, setReport] = useState<any | null>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);

  useEffect(() => {
    if (!reportId) return;
    let mounted = true;

    fetchAuditReport(reportId).then((data) => {
      if (!mounted) return;
      setReport(data.report);
      setFindings(data.findings);
      setGates(data.gates);
    });

    return () => { mounted = false; };
  }, [reportId]);

  return { report, findings, gates };
}
