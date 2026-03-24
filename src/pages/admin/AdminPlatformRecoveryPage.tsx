import { useState, useEffect, useCallback } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Shield, Clock, CheckCircle, XCircle, SkipForward, Wrench, Timer, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  runPlatformRecovery,
  type RecoveryRunReport,
  type ModuleCheckResult,
  type ModuleStatus,
} from "@/lib/platform/platform-recovery-engine";

const statusIcon: Record<ModuleStatus, React.ReactNode> = {
  ok: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  fixed: <Wrench className="h-4 w-4 text-amber-500" />,
  skipped: <SkipForward className="h-4 w-4 text-muted-foreground" />,
};

const statusColor: Record<ModuleStatus, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  fixed: "bg-amber-500/10 text-amber-700 border-amber-200",
  skipped: "bg-muted text-muted-foreground border-border",
};

interface DbRun {
  id: string;
  trigger_type: string;
  started_at: string;
  completed_at: string | null;
  total_ms: number | null;
  summary_json: any;
  modules_json: any[];
  auto_fixes_count: number;
  errors_count: number;
  status: string;
}

const CRON_JOBS = [
  { name: "platform-recovery-health", schedule: "*/10 * * * *", desc: "Backend health check", job: "health" },
  { name: "platform-recovery-daily-full", schedule: "0 3 * * * (UTC)", desc: "Full recovery + analytics", job: "full" },
  { name: "platform-boost-analytics", schedule: "0 */6 * * *", desc: "Boost analytics aggregation", job: "analytics" },
];

function ModuleRow({ m }: { m: ModuleCheckResult }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md border text-xs">
      <div className="flex items-center gap-2">
        {statusIcon[m.status]}
        <span className="font-mono font-medium">{m.module}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground truncate max-w-[180px]">{m.detail}</span>
        <Badge variant="outline" className={statusColor[m.status]}>{m.status}</Badge>
        <span className="text-muted-foreground">{m.durationMs}ms</span>
      </div>
    </div>
  );
}

export default function AdminPlatformRecoveryPage() {
  const [running, setRunning] = useState(false);
  const [clientRun, setClientRun] = useState<RecoveryRunReport | null>(null);
  const [dbRuns, setDbRuns] = useState<DbRun[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDbRuns = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("platform_recovery_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (data) setDbRuns(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDbRuns();
  }, [loadDbRuns]);

  const handleClientRun = useCallback(async () => {
    setRunning(true);
    try {
      const report = await runPlatformRecovery("manual");
      setClientRun(report);
    } finally {
      setRunning(false);
    }
  }, []);

  const handleServerRun = useCallback(async () => {
    setRunning(true);
    try {
      await supabase.functions.invoke("platform-recovery", { body: { job: "full" } });
      await new Promise(r => setTimeout(r, 2000));
      await loadDbRuns();
    } finally {
      setRunning(false);
    }
  }, [loadDbRuns]);

  const latestDb = dbRuns[0];
  const displayModules: ModuleCheckResult[] = clientRun?.modules ?? (latestDb?.modules_json as any) ?? [];
  const displaySummary = clientRun?.summary ?? latestDb?.summary_json;

  const groups = displayModules.length > 0
    ? ["backend", "core", "state", "audit", "analytics", "fix"]
        .map(g => ({ group: g, items: displayModules.filter((m: any) => m.group === g) }))
        .filter(g => g.items.length > 0)
    : [];

  return (
    <AppPageShell title="Platform Recovery">
      <div className="space-y-4 mt-4">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleClientRun} disabled={running} size="sm" className="gap-2">
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Client Run
          </Button>
          <Button onClick={handleServerRun} disabled={running} size="sm" variant="outline" className="gap-2">
            <Database className="h-4 w-4" />
            Server Run (Edge)
          </Button>
          <Button variant="outline" size="sm" onClick={loadDbRuns} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Cron Jobs Status */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Timer className="h-4 w-4" /> Active Cron Jobs (pg_cron)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {CRON_JOBS.map(job => (
              <div key={job.name} className="flex items-center justify-between py-2 px-3 rounded-md border text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="font-mono font-medium">{job.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{job.desc}</span>
                  <Badge variant="outline">{job.schedule}</Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">ACTIVE</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Summary */}
        {displaySummary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{displaySummary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{displaySummary.ok}</p>
              <p className="text-xs text-muted-foreground">OK</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-destructive">{displaySummary.error}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{displaySummary.fixed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Fixed</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{clientRun?.totalMs ?? latestDb?.total_ms ?? 0}ms</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </CardContent></Card>
          </div>
        )}

        {/* Module details */}
        {groups.map(({ group, items }) => (
          <Card key={group}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider">{group}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {items.map((m: any) => <ModuleRow key={m.module} m={m} />)}
            </CardContent>
          </Card>
        ))}

        {/* DB Run History */}
        {dbRuns.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" /> Server Run History (DB persisted)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {dbRuns.map(run => (
                <div key={run.id} className="flex items-center justify-between text-xs border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{run.trigger_type}</Badge>
                    <span className="text-muted-foreground">{new Date(run.started_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={run.status === "healthy" ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}>
                      {run.status}
                    </Badge>
                    <span className="text-emerald-600">{run.summary_json?.ok ?? 0}✓</span>
                    <span className="text-destructive">{run.errors_count}✗</span>
                    <span className="text-muted-foreground">{run.total_ms}ms</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {loading && !displaySummary && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading recovery data...
            </CardContent>
          </Card>
        )}
      </div>
    </AppPageShell>
  );
}
