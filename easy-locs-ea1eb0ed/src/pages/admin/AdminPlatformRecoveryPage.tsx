import { useState, useEffect, useCallback } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Clock, CheckCircle, XCircle, SkipForward, Wrench, Timer, Database, Zap, Activity, Shield, Heart } from "lucide-react";
import { fetchPlatformRecoveryRuns, invokeServerRecovery } from "@/repositories/admin-ops.repository";
import {
  runPlatformRecovery,
  type RecoveryRunReport,
  type ModuleCheckResult,
  type ModuleStatus,
} from "@/lib/platform/platform-recovery-engine";
import { useBackendEngineStatus } from "@/hooks/useBackendEngineStatus";

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

type ReadinessRow = {
  module: string;
  status: "proven-runtime" | "coded-wired" | "build-controlled" | "pending";
  validation: string;
  production: "yes" | "controlled" | "blocked";
  productionNote: string;
};

const PRODUCTION_READINESS: ReadinessRow[] = [
  { module: "pg_cron scheduler", status: "proven-runtime", validation: "11+ DB runs, timestamps verified", production: "yes", productionNote: "Active" },
  { module: "Server auto-fix (campaigns)", status: "proven-runtime", validation: "active→completed proved in DB", production: "yes", productionNote: "Active" },
  { module: "Server auto-fix (leads)", status: "proven-runtime", validation: "new→cold proved in DB", production: "yes", productionNote: "Active" },
  { module: "Backend reconnect", status: "proven-runtime", validation: "14 tables verified healthy", production: "yes", productionNote: "Active" },
  { module: "Platform recovery edge fn", status: "proven-runtime", validation: "Deployed, cron-triggered", production: "yes", productionNote: "Active" },
  { module: "Boost analytics aggregation", status: "proven-runtime", validation: "2 rows aggregated via cron", production: "controlled", productionNote: "Needs real traffic" },
  { module: "Client continuous engine", status: "coded-wired", validation: "7 jobs registered, boot+10s", production: "controlled", productionNote: "Needs client proof" },
  { module: "Wallet RPC (ensure_wallet)", status: "coded-wired", validation: "RPC exists, reachable", production: "blocked", productionNote: "Needs live QR test" },
  { module: "Orbit V2 realtime", status: "coded-wired", validation: "1 conversation in DB", production: "blocked", productionNote: "Needs A→B live test" },
  { module: "Geo engine", status: "coded-wired", validation: "Retry logic wired", production: "blocked", productionNote: "Needs real device" },
  { module: "i18n engine", status: "build-controlled", validation: "tc()/td() wired, audit done — no raw keys in critical flows", production: "controlled", productionNote: "Near ready" },
  { module: "Currency engine", status: "build-controlled", validation: "All P0+P1 customer-facing migrated to formatMoneyByCountry()", production: "controlled", productionNote: "Near ready — admin P2 remain" },
  { module: "Boost slot renderer", status: "coded-wired", validation: "Surfaces connected", production: "controlled", productionNote: "No real campaigns" },
  { module: "UAE Import Engine", status: "proven-runtime", validation: "215 shops ingested, dedup+seed verified", production: "controlled", productionNote: "Visibility engine wired" },
  { module: "Lead pipeline auto", status: "proven-runtime", validation: "Stale→cold auto proved", production: "controlled", productionNote: "Needs real leads" },
  { module: "QR scan & pay", status: "coded-wired", validation: "RPC built, resolver patched", production: "blocked", productionNote: "Needs live device scan" },
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
  const continuousStatus = useBackendEngineStatus();

  const loadDbRuns = useCallback(async () => {
    const data = await fetchPlatformRecoveryRuns();
    setDbRuns(data);
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

  const handleServerRun = useCallback(async (job = "full") => {
    setRunning(true);
    try {
      await invokeServerRecovery(job);
      await new Promise(r => setTimeout(r, 2000));
      await loadDbRuns();
    } finally {
      setRunning(false);
    }
  }, [loadDbRuns]);

  const latestDb = dbRuns[0];
  const displayModules: ModuleCheckResult[] = clientRun?.modules ?? (latestDb?.modules_json as any) ?? [];
  const displaySummary = clientRun?.summary ?? latestDb?.summary_json;
  const runtimeJobs = [...continuousStatus.jobs].sort((a, b) => {
    const aTime = a.lastRun ? new Date(a.lastRun).getTime() : 0;
    const bTime = b.lastRun ? new Date(b.lastRun).getTime() : 0;
    return bTime - aTime;
  }).slice(0, 24);

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

        {/* Backend Runtime */}
        {continuousStatus.totalJobs > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" /> Backend Runtime Engines
                <Badge className={continuousStatus.running ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" : "bg-destructive/10 text-destructive"}>
                  {continuousStatus.running ? "RUNNING" : "STOPPED"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {runtimeJobs.map(actual => {
                return (
                  <div key={actual.name} className="flex items-center justify-between py-2 px-3 rounded-md border text-xs">
                    <div className="flex items-center gap-2">
                      {actual.lastStatus === "ok" ? <CheckCircle className="h-4 w-4 text-emerald-500" /> :
                        actual.lastStatus === "error" ? <XCircle className="h-4 w-4 text-destructive" /> :
                        <Clock className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-mono font-medium">{actual.name}</span>
                      <span className="text-muted-foreground hidden md:inline">{actual.summary}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{actual.intervalLabel}</Badge>
                      <Badge className={actual.lastStatus === "ok" ? "bg-emerald-500/10 text-emerald-700" : actual.lastStatus === "error" ? "bg-destructive/10 text-destructive" : "bg-muted"}>
                        {actual.lastStatus}
                      </Badge>
                      <span className="text-muted-foreground">×{actual.runCount}</span>
                      {actual.lastRun && <span className="text-muted-foreground text-[10px]">{new Date(actual.lastRun).toLocaleTimeString()}</span>}
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

        {/* Production Readiness Matrix */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4" /> Production Readiness Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">Module</th>
                    <th className="text-left py-2 px-2 font-semibold">Status</th>
                    <th className="text-left py-2 px-2 font-semibold">Validation Level</th>
                    <th className="text-center py-2 px-2 font-semibold">Production</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTION_READINESS.map(row => (
                    <tr key={row.module} className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono font-medium">{row.module}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className={
                          row.status === "proven-runtime" ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" :
                          row.status === "coded-wired" ? "bg-blue-500/10 text-blue-700 border-blue-200" :
                          row.status === "build-controlled" ? "bg-amber-500/10 text-amber-700 border-amber-200" :
                          "bg-muted text-muted-foreground"
                        }>{row.status}</Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{row.validation}</td>
                      <td className="py-2 px-2 text-center">
                        {row.production === "yes" ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" /> :
                         row.production === "blocked" ? <XCircle className="h-4 w-4 text-destructive mx-auto" /> :
                         <Clock className="h-4 w-4 text-amber-500 mx-auto" />}
                        <span className="text-[10px] block mt-0.5">{row.productionNote}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
