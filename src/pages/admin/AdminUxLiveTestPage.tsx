/**
 * AdminUxLiveTestPage — UX Auto-Test cockpit showing live test results, errors, and UX score.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { runUxAutoTest, type UxAutoTestReport } from "@/lib/engines/ux-autotest-engine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(var(--destructive))",
  warning: "hsl(30, 80%, 50%)",
  info: "hsl(var(--muted-foreground))",
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <XCircle className="w-3.5 h-3.5" />,
  warning: <AlertTriangle className="w-3.5 h-3.5" />,
  info: <Activity className="w-3.5 h-3.5" />,
};

export default function AdminUxLiveTestPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<UxAutoTestReport | null>(null);
  const [running, setRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  const runTest = () => {
    setRunning(true);
    setTimeout(() => {
      const result = runUxAutoTest();
      setReport(result);
      setRunning(false);
    }, 500);
  };

  useEffect(() => {
    runTest();
  }, []);

  useEffect(() => {
    if (!autoRun) return;
    const interval = setInterval(runTest, 120000); // 2min
    return () => clearInterval(interval);
  }, [autoRun]);

  const scoreColor = !report ? "hsl(var(--muted-foreground))" :
    report.uxScore >= 90 ? "hsl(var(--success))" :
    report.uxScore >= 70 ? "hsl(30, 80%, 50%)" :
    "hsl(var(--destructive))";

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">UX Live Test</h1>
          <p className="text-xs text-muted-foreground">Auto-test engine • Continuous UX monitoring</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAutoRun(!autoRun)}
          className="text-[10px]"
        >
          {autoRun ? "⏸ Stop" : "▶ Auto"}
        </Button>
      </div>

      {/* UX Score */}
      <div className="px-4 mb-4">
        <Card className="p-4 border-border/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">UX Score</p>
              <p className="text-4xl font-black" style={{ color: scoreColor }}>
                {report?.uxScore ?? "—"}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {report ? `${report.passed}/${report.totalTests} categories passed` : "Not tested yet"}
              </p>
            </div>
            <Button
              onClick={runTest}
              disabled={running}
              size="sm"
              className="gap-1"
            >
              {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {running ? "Testing..." : "Run Test"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-4">
        <StatCard label="Tests" value={String(report?.totalTests ?? "—")} />
        <StatCard label="Errors" value={String(report?.failed ?? "—")} color={report && report.failed > 0 ? "hsl(var(--destructive))" : undefined} />
        <StatCard label="Auto-Fixed" value={String(report?.autoFixed ?? "—")} color="hsl(var(--success))" />
        <StatCard label="Page" value={typeof window !== "undefined" ? window.location.pathname : "—"} small />
      </div>

      {/* Error List */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-foreground mb-2">
          Detected Issues ({report?.results.length ?? 0})
        </h2>

        {report?.results.length === 0 && (
          <Card className="p-6 border-border/20 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--success))" }} />
            <p className="text-sm font-bold text-foreground">All Clear</p>
            <p className="text-xs text-muted-foreground">No UX issues detected on this page</p>
          </Card>
        )}

        <div className="space-y-2">
          {report?.results.map((r) => (
            <Card key={r.id} className="p-3 border-border/20">
              <div className="flex items-start gap-2">
                <div style={{ color: SEVERITY_COLORS[r.severity] }} className="mt-0.5">
                  {SEVERITY_ICONS[r.severity]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ background: `${SEVERITY_COLORS[r.severity]}15`, color: SEVERITY_COLORS[r.severity] }}>
                      {r.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{r.severity}</span>
                  </div>
                  <p className="text-xs text-foreground mt-1">{r.description}</p>
                  {r.element && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{r.element}</p>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-1">Page: {r.page}</p>
                </div>
                {r.autoFixable && (
                  <Button size="sm" variant="outline" className="text-[9px] shrink-0">
                    Fix
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <Card className="p-2 border-border/20 text-center">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className={`${small ? "text-[10px]" : "text-lg"} font-bold`} style={color ? { color } : undefined}>
        {value}
      </p>
    </Card>
  );
}
