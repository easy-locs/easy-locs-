/**
 * DINO Audit Dashboard — Internal admin page for DINO engine results.
 */
import { useState } from "react";
import { runDinoAudit, type DinoReport } from "@/lib/dino/dinoEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Shield, AlertTriangle, CheckCircle2, XCircle, Wrench, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DinoAuditPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<DinoReport | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setReport(runDinoAudit());
      setRunning(false);
    }, 300);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">DINO Engine</h1>
          <p className="text-xs text-muted-foreground">Autonomous Design Intelligence</p>
        </div>
        <Button onClick={handleRun} disabled={running} size="sm">
          <Play className="h-4 w-4 mr-1" />
          {running ? "Scanning…" : "Run Audit"}
        </Button>
      </header>

      <main className="p-4 space-y-4 max-w-3xl mx-auto pb-24">
        {!report && !running && (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Press "Run Audit" to scan the entire app</p>
            </CardContent>
          </Card>
        )}

        {running && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Scanning pages, routes, onboarding flows…</p>
            </CardContent>
          </Card>
        )}

        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="Pages" value={report.summary.totalPages} icon={<FileText className="h-4 w-4" />} />
              <SummaryCard label="Routes" value={report.summary.totalRoutes} icon={<FileText className="h-4 w-4" />} />
              <SummaryCard label="Issues" value={report.summary.totalIssues} icon={<AlertTriangle className="h-4 w-4" />} variant={report.summary.totalIssues > 0 ? "warning" : "success"} />
              <SummaryCard label="Auto-Fixed" value={report.summary.autoFixed} icon={<Wrench className="h-4 w-4" />} variant="success" />
            </div>

            {/* Severity Breakdown */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Issue Severity</CardTitle></CardHeader>
              <CardContent className="flex gap-3 flex-wrap">
                <Badge variant="destructive">{report.summary.critical} Critical</Badge>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">{report.summary.major} Major</Badge>
                <Badge variant="secondary">{report.summary.minor} Minor</Badge>
              </CardContent>
            </Card>

            {/* Onboarding Health */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Onboarding Flows</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{report.onboardingHealth.healthy} Healthy</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span>{report.onboardingHealth.partial} Partial</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>{report.onboardingHealth.broken} Broken</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  {report.onboardingHealth.totalFlows} total flows inventoried • {report.onboardingHealth.recoveryPlan.length} recovery actions needed
                </p>
              </CardContent>
            </Card>

            {/* Recovery Plan */}
            {report.onboardingHealth.recoveryPlan.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Recovery Plan</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {report.onboardingHealth.recoveryPlan.slice(0, 10).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm border-b border-border/30 pb-2 last:border-0">
                      <Badge variant={action.priority === "high" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                        {action.priority}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium">{action.flowName}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Patches */}
            {report.patches.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Patch Proposals ({report.patches.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {report.patches.slice(0, 8).map((p, i) => (
                    <div key={i} className="text-sm border-b border-border/30 pb-2 last:border-0">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.rootCause}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Verification */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Verification</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">Resolution rate: <strong>{report.summary.verificationRate}%</strong></p>
                <p className="text-xs text-muted-foreground mt-1">Scanned at {new Date(report.scannedAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, icon, variant }: { label: string; value: number; icon: React.ReactNode; variant?: "success" | "warning" }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${variant === "warning" ? "bg-orange-500/10 text-orange-500" : variant === "success" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
