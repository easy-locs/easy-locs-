import { useState, useEffect, useCallback } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Shield, Clock, CheckCircle, XCircle, SkipForward, Wrench } from "lucide-react";
import {
  runPlatformRecovery,
  getRecoveryRuns,
  getLastRun,
  type RecoveryRunReport,
  type ModuleCheckResult,
  type ModuleStatus,
} from "@/lib/platform/platform-recovery-engine";

const statusIcon: Record<ModuleStatus, React.ReactNode> = {
  ok: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  fixed: <Wrench className="h-4 w-4 text-amber-500" />,
  skipped: <SkipForward className="h-4 w-4 text-muted-foreground" />,
};

const statusColor: Record<ModuleStatus, string> = {
  ok: "bg-green-500/10 text-green-700 border-green-200",
  error: "bg-red-500/10 text-red-700 border-red-200",
  fixed: "bg-amber-500/10 text-amber-700 border-amber-200",
  skipped: "bg-muted text-muted-foreground border-border",
};

function ModuleRow({ m }: { m: ModuleCheckResult }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md border" style={{ fontSize: "0.8rem" }}>
      <div className="flex items-center gap-2">
        {statusIcon[m.status]}
        <span className="font-mono font-medium">{m.module}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground truncate max-w-[200px]">{m.detail}</span>
        <Badge variant="outline" className={statusColor[m.status]}>{m.status}</Badge>
        <span className="text-xs text-muted-foreground">{m.durationMs}ms</span>
      </div>
    </div>
  );
}

export default function AdminPlatformRecoveryPage() {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<RecoveryRunReport | null>(null);
  const [history, setHistory] = useState<RecoveryRunReport[]>([]);

  useEffect(() => {
    setCurrent(getLastRun());
    setHistory(getRecoveryRuns());
  }, []);

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      const report = await runPlatformRecovery("manual");
      setCurrent(report);
      setHistory(getRecoveryRuns());
    } finally {
      setRunning(false);
    }
  }, []);

  const groups = current?.modules
    ? ["backend", "core", "state", "audit", "fix"].map((g) => ({
        group: g,
        items: current.modules.filter((m) => m.group === g),
      })).filter((g) => g.items.length > 0)
    : [];

  return (
    <AppPageShell title="Platform Recovery">
      <div className="space-y-4 mt-4">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button onClick={handleRun} disabled={running} className="gap-2">
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running..." : "Run Recovery"}
          </Button>
          <Button variant="outline" onClick={handleRun} disabled={running} className="gap-2">
            <Shield className="h-4 w-4" />
            Force Reconnect
          </Button>
        </div>

        {/* Summary */}
        {current && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{current.summary.total}</p>
                <p className="text-xs text-muted-foreground">Total checks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-600">{current.summary.ok}</p>
                <p className="text-xs text-muted-foreground">OK</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-red-600">{current.summary.error}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{current.summary.fixed}</p>
                <p className="text-xs text-muted-foreground">Fixed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{current.totalMs}ms</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Module details */}
        {groups.map(({ group, items }) => (
          <Card key={group}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider">{group}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {items.map((m) => (
                <ModuleRow key={m.module} m={m} />
              ))}
            </CardContent>
          </Card>
        ))}

        {/* History */}
        {history.length > 1 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" /> Run History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {history.slice(0, 10).map((run) => (
                <div key={run.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{run.trigger}</Badge>
                    <span className="text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">{run.summary.ok}✓</span>
                    <span className="text-red-600">{run.summary.error}✗</span>
                    <span className="text-muted-foreground">{run.totalMs}ms</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!current && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No recovery runs yet. Click "Run Recovery" to start.
            </CardContent>
          </Card>
        )}
      </div>
    </AppPageShell>
  );
}
