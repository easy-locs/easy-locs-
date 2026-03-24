import { useState, useEffect, useCallback } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Clock, CheckCircle, XCircle, SkipForward, Wrench, Timer, Database, Zap, Activity, Shield, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  runPlatformRecovery,
  type RecoveryRunReport,
  type ModuleCheckResult,
  type ModuleStatus,
} from "@/lib/platform/platform-recovery-engine";
import { getContinuousEngineStatus } from "@/lib/platform/platform-continuous-engine";

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
  { name: "recovery-health-5min", schedule: "*/5 * * * *", desc: "Backend health + RPC + reconnect" },
  { name: "recovery-full-10min", schedule: "*/10 * * * *", desc: "Full recovery + audit + auto-fix" },
  { name: "boost-analytics-6h", schedule: "0 */6 * * *", desc: "Boost analytics aggregation" },
  { name: "daily-full-3am", schedule: "0 3 * * *", desc: "Full recovery + cleanup + analytics" },
  { name: "lead-pipeline-10min", schedule: "*/10 * * * *", desc: "Lead pipeline health check" },
  { name: "stale-cleanup-daily", schedule: "0 4 * * *", desc: "Cleanup old runs + stale data" },
];

const CLIENT_JOBS_EXPECTED = [
  { name: "engine-health", interval: "5min", desc: "Engine health checks" },
  { name: "platform-recovery", interval: "10min", desc: "Full platform recovery" },
  { name: "auto-fix", interval: "5min", desc: "Auto-fix (i18n, geo, stores)" },
  { name: "health-checks", interval: "5min", desc: "Geo + wallet + lead health" },
  { name: "store-consistency", interval: "5min", desc: "Store hydration verification" },
  { name: "boost-slot-refresh", interval: "1h", desc: "Boost cache invalidation" },
  { name: "backend-reconnect", interval: "5min", desc: "Backend reconnect verification" },
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
  const [continuousStatus, setContinuousStatus] = useState<ReturnType<typeof getContinuousEngineStatus> | null>(null);

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
    setContinuousStatus(getContinuousEngineStatus());
    const timer = setInterval(() => setContinuousStatus(getContinuousEngineStatus()), 10000);
    return () => clearInterval(timer);
  }, [loadDbRuns]);

  const handleClientRun = useCallback(async () => {
    setRunning(true);
    try {
      const report = await runPlatformRecovery("manual");
      setClientRun(report);
    } finally {
      setRunning(false);
      setContinuousStatus(getContinuousEngineStatus());
    }
  }, []);

  const handleServerRun = useCallback(async (job = "full") => {
    setRunning(true);
    try {
      await supabase.functions.invoke("platform-recovery", { body: { job } });
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
    ? ["backend", "core", "state", "health", "autofix", "audit", "analytics", "maintenance", "fix"]
        .map(g => ({ group: g, items: displayModules.filter((m: any) => m.group === g) }))
        .filter(g => g.items.length > 0)
    : [];

  return (
    <AppPageShell title="Platform Recovery & Automation">
      <div className="space-y-4 mt-4">
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleClientRun} disabled={running} size="sm" className="gap-2">
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Client Run (All)
          </Button>
          <Button onClick={() => handleServerRun("full")} disabled={running} size="sm" variant="outline" className="gap-2">
            <Database className="h-4 w-4" /> Server Full
          </Button>
          <Button onClick={() => handleServerRun("health")} disabled={running} size="sm" variant="outline" className="gap-2">
            <Heart className="h-4 w-4" /> Health
          </Button>
          <Button onClick={() => handleServerRun("autofix")} disabled={running} size="sm" variant="outline" className="gap-2">
            <Wrench className="h-4 w-4" /> Auto-Fix
          </Button>
          <Button onClick={() => handleServerRun("analytics")} disabled={running} size="sm" variant="outline" className="gap-2">
            <Zap className="h-4 w-4" /> Analytics
          </Button>
          <Button variant="outline" size="sm" onClick={loadDbRuns} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Summary */}
        {displaySummary && (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {[
              { label: "Total", value: displaySummary.total, color: "" },
              { label: "OK", value: displaySummary.ok, color: "text-emerald-600" },
              { label: "Errors", value: displaySummary.error, color: "text-destructive" },
              { label: "Fixed", value: displaySummary.fixed ?? 0, color: "text-amber-600" },
              { label: "Auto-Fixes", value: displaySummary.autoFixesApplied ?? displaySummary.fixed ?? 0, color: "text-amber-600" },
              { label: "Health Issues", value: displaySummary.healthIssues ?? 0, color: "text-orange-600" },
              { label: "Duration", value: `${clientRun?.totalMs ?? latestDb?.total_ms ?? 0}ms`, color: "" },
            ].map(({ label, value, color }) => (
              <Card key={label}><CardContent className="pt-3 pb-2 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </CardContent></Card>
            ))}
          </div>
        )}

        {/* Client Continuous Engine */}
        {continuousStatus && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" /> Client Continuous Engine
                <Badge className={continuousStatus.running ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" : "bg-destructive/10 text-destructive"}>
                  {continuousStatus.running ? "RUNNING" : "STOPPED"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {CLIENT_JOBS_EXPECTED.map(expected => {
                const actual = continuousStatus.jobs.find(j => j.name === expected.name);
                return (
                  <div key={expected.name} className="flex items-center justify-between py-2 px-3 rounded-md border text-xs">
                    <div className="flex items-center gap-2">
                      {actual ? (
                        actual.lastStatus === "ok" ? <CheckCircle className="h-4 w-4 text-emerald-500" /> :
                        actual.lastStatus === "error" ? <XCircle className="h-4 w-4 text-destructive" /> :
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      ) : <XCircle className="h-4 w-4 text-muted-foreground/50" />}
                      <span className="font-mono font-medium">{expected.name}</span>
                      <span className="text-muted-foreground hidden md:inline">{expected.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{expected.interval}</Badge>
                      {actual ? (
                        <>
                          <Badge className={actual.lastStatus === "ok" ? "bg-emerald-500/10 text-emerald-700" : actual.lastStatus === "error" ? "bg-destructive/10 text-destructive" : "bg-muted"}>
                            {actual.lastStatus}
                          </Badge>
                          <span className="text-muted-foreground">×{actual.runCount}</span>
                          {actual.lastRun && <span className="text-muted-foreground text-[10px]">{new Date(actual.lastRun).toLocaleTimeString()}</span>}
                        </>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">pending</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Server Cron Jobs */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Timer className="h-4 w-4" /> Server Cron Jobs (pg_cron)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {CRON_JOBS.map(job => (
              <div key={job.name} className="flex items-center justify-between py-2 px-3 rounded-md border text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="font-mono font-medium">{job.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground hidden md:inline">{job.desc}</span>
                  <Badge variant="outline">{job.schedule}</Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">ACTIVE</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Module details by group */}
        {groups.map(({ group, items }) => (
          <Card key={group}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider">{group}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {items.map((m: any, i: number) => <ModuleRow key={`${m.module}-${i}`} m={m} />)}
            </CardContent>
          </Card>
        ))}

        {/* DB Run History */}
        {dbRuns.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" /> Server Run History
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
                    {run.auto_fixes_count > 0 && <span className="text-amber-600">🔧{run.auto_fixes_count}</span>}
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
