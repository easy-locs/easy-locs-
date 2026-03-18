import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { runMasterAudit } from "@/lib/audit/master-audit-engine";
import { useAuditReport } from "@/hooks/useAuditReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ShieldCheck, AlertTriangle, XCircle, Info } from "lucide-react";

function severityIcon(severity: string) {
  if (severity === "critical") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
  return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function gateStatusColor(status: string) {
  if (status === "pass") return "text-success";
  if (status === "fail") return "text-destructive";
  if (status === "warning") return "text-warning";
  return "text-muted-foreground";
}

export default function AuditDebugPanelPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { report, findings, gates } = useAuditReport(reportId ?? undefined);

  const run = async () => {
    setLoading(true);
    try {
      const result = await runMasterAudit(activeWorkspace?.id);
      setReportId(result.id);
    } finally {
      setLoading(false);
    }
  };

  const critical = findings.filter((x) => x.severity === "critical");
  const warning = findings.filter((x) => x.severity === "warning");
  const info = findings.filter((x) => x.severity === "info");

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 max-w-2xl mx-auto">
      <BackCard label="Back" />

      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Audit Debug Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full automated audit with score, findings and launch gates
        </p>
      </div>

      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Running audit…</> : "Run Master Audit"}
      </Button>

      {!!report && (
        <div className="space-y-5">
          {/* Score Card */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="text-2xl font-bold text-foreground">{report.total_score}/100</span>
              </div>
              <Progress value={report.total_score} className="h-2.5" />
              <div className="flex gap-4 text-xs">
                <span className="text-destructive font-medium">{report.critical_count} critical</span>
                <span className="text-warning font-medium">{report.warning_count} warnings</span>
                <span className="text-muted-foreground">{report.info_count} info</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Status: <span className="font-semibold text-foreground">{report.status}</span>
              </p>
            </CardContent>
          </Card>

          {/* Launch Gates */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Launch Gates</h2>
            <div className="grid grid-cols-2 gap-2">
              {gates.map((gate: any) => (
                <Card key={gate.id}>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-foreground">{gate.gate_key}</p>
                    <p className={`text-sm font-bold ${gateStatusColor(gate.status)}`}>{gate.status.toUpperCase()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Critical */}
          {critical.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-destructive">Critical Findings</h2>
              {critical.map((row: any) => (
                <Card key={row.id} className="border-destructive/40">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      {severityIcon("critical")}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{row.title}</p>
                        <p className="text-[10px] text-muted-foreground">{row.finding_key}</p>
                        {row.actual_state && <p className="text-[10px] text-muted-foreground">actual: {row.actual_state}</p>}
                        {row.action_hint && <p className="text-[10px] text-primary">fix: {row.action_hint}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warning.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-warning">Warnings</h2>
              {warning.map((row: any) => (
                <Card key={row.id} className="border-warning/30">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      {severityIcon("warning")}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{row.title}</p>
                        <p className="text-[10px] text-muted-foreground">{row.finding_key}</p>
                        {row.actual_state && <p className="text-[10px] text-muted-foreground">actual: {row.actual_state}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info */}
          {info.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Info</h2>
              {info.map((row: any) => (
                <Card key={row.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {severityIcon("info")}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{row.title}</p>
                        {row.actual_state && <p className="text-[10px] text-muted-foreground">{row.actual_state}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
