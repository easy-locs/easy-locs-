import SubPageShell from "@/components/layout/SubPageShell";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Play, Shield, Activity, AlertTriangle, CheckCircle, XCircle, Clock, Gauge, Zap } from "lucide-react";
import { db } from "@/services/db";
import { loadCardsFromServer, type DashboardCard } from "@/lib/runtime/read-models";
import { getAnomalyEvents, getAllDomainMetrics, type AnomalyEvent } from "@/lib/runtime/anomaly-detection";
import { getDbHealthSummary } from "@/lib/runtime/db-observability";

interface AutonomySystem {
  system_name: string;
  display_name: string;
  status: "green" | "yellow" | "red" | "unknown";
  last_run_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  success_count_24h: number;
  fail_count_24h: number;
  last_error_message: string | null;
  metadata_json: Record<string, unknown>;
  updated_at: string;
}

interface DlqStats {
  pending: number;
  retrying: number;
  dead: number;
  resolved: number;
}

interface JobQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface UptimeEntry {
  status: string;
  total_ms: number;
  consecutive_failures: number;
  created_at: string;
}

const STATUS_CONFIG = {
  green: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", dot: "bg-emerald-500", text: "text-emerald-400", label: "Healthy" },
  yellow: { bg: "bg-amber-500/15", border: "border-amber-500/30", dot: "bg-amber-500", text: "text-amber-400", label: "Degraded" },
  red: { bg: "bg-red-500/15", border: "border-red-500/30", dot: "bg-red-500", text: "text-red-400", label: "Down" },
  unknown: { bg: "bg-zinc-500/15", border: "border-zinc-500/30", dot: "bg-zinc-500", text: "text-zinc-400", label: "Unknown" },
};

const SYSTEM_ICONS: Record<string, typeof Shield> = {
  pg_cron_dispatcher: Clock,
  push_notifications: Activity,
  dead_letter_queue: AlertTriangle,
  alert_engine: AlertTriangle,
  uptime_watchdog: Shield,
  rate_limiter: Shield,
  job_queue: Activity,
  state_cache: Activity,
  storage_backup: Shield,
  autonomy_dashboard: CheckCircle,
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AdminAutonomyDashboardPage() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState<AutonomySystem[]>([]);
  const [dlqStats, setDlqStats] = useState<DlqStats>({ pending: 0, retrying: 0, dead: 0, resolved: 0 });
  const [jobStats, setJobStats] = useState<JobQueueStats>({ pending: 0, processing: 0, completed: 0, failed: 0 });
  const [uptimeHistory, setUptimeHistory] = useState<UptimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [readModelCards, setReadModelCards] = useState<DashboardCard[]>([]);
  const [anomalyEvents, setAnomalyEvents] = useState<AnomalyEvent[]>([]);
  const [domainMetrics, setDomainMetrics] = useState<Record<string, any>>({});
  const [dbHealth, setDbHealth] = useState<ReturnType<typeof getDbHealthSummary> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [systemsRes, dlqPendingRes, dlqRetryingRes, dlqDeadRes, dlqResolvedRes, jobPendingRes, jobProcessingRes, jobCompletedRes, jobFailedRes, uptimeRes] = await Promise.all([
        db.from("autonomy_system_status").select("*").order("system_name"),
        db.from("dead_letter_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("dead_letter_queue").select("id", { count: "exact", head: true }).eq("status", "retrying"),
        db.from("dead_letter_queue").select("id", { count: "exact", head: true }).eq("status", "dead"),
        db.from("dead_letter_queue").select("id", { count: "exact", head: true }).eq("status", "resolved"),
        db.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "processing"),
        db.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "completed"),
        db.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
        db.from("system_uptime_log").select("status, total_ms, consecutive_failures, created_at").order("created_at", { ascending: false }).limit(20),
      ]);

      setSystems((systemsRes.data ?? []) as AutonomySystem[]);
      setDlqStats({
        pending: dlqPendingRes.count ?? 0,
        retrying: dlqRetryingRes.count ?? 0,
        dead: dlqDeadRes.count ?? 0,
        resolved: dlqResolvedRes.count ?? 0,
      });
      setJobStats({
        pending: jobPendingRes.count ?? 0,
        processing: jobProcessingRes.count ?? 0,
        completed: jobCompletedRes.count ?? 0,
        failed: jobFailedRes.count ?? 0,
      });
      setUptimeHistory((uptimeRes.data ?? []) as UptimeEntry[]);

      const cards = await loadCardsFromServer(db).catch(() => [] as DashboardCard[]);
      setReadModelCards(cards);
      setAnomalyEvents(getAnomalyEvents(undefined, 20));
      setDomainMetrics(getAllDomainMetrics());
      setDbHealth(getDbHealthSummary());
    } catch (e) {
      console.error("Failed to load autonomy data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const triggerSystem = async (systemName: string) => {
    setTriggering(systemName);
    try {
      const targetMap: Record<string, string> = {
        pg_cron_dispatcher: "autonomous-cron-dispatcher",
        dead_letter_queue: "dlq-processor",
        uptime_watchdog: "watchdog-ping",
        job_queue: "job-queue-worker",
        state_cache: "cache-manager",
        storage_backup: "backup-storage",
      };

      const target = targetMap[systemName];
      if (!target) return;

      const payloadMap: Record<string, Record<string, unknown>> = {
        "cache-manager": { action: "refresh_all" },
      };

      await db.functions.invoke("admin-trigger", {
        body: { target, payload: payloadMap[target] ?? {} },
      });
      await loadData();
    } catch (e) {
      console.error("Trigger failed:", e);
    } finally {
      setTriggering(null);
    }
  };

  const autonomyScore = (() => {
    if (systems.length === 0) return 0;
    const weights: Record<string, number> = { green: 100, yellow: 50, red: 0, unknown: 0 };
    const total = systems.reduce((sum, s) => sum + (weights[s.status] ?? 0), 0);
    return Math.round(total / systems.length);
  })();

  const scoreColor = autonomyScore >= 80 ? "text-emerald-400" : autonomyScore >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <SubPageShell noContentPad className="bg-background text-foreground">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Autonomy Dashboard</h1>
            <p className="text-xs text-muted-foreground">24/7 Non-Stop Engine Systems</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="p-4 space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Autonomy Score</p>
            <p className={`text-3xl font-bold ${scoreColor}`}>{autonomyScore}%</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Systems Online</p>
            <p className="text-3xl font-bold text-emerald-400">
              {systems.filter((s) => s.status === "green").length}/{systems.length}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">DLQ Pending</p>
            <p className={`text-3xl font-bold ${dlqStats.pending > 50 ? "text-red-400" : dlqStats.pending > 10 ? "text-amber-400" : "text-emerald-400"}`}>
              {dlqStats.pending}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Jobs Queued</p>
            <p className="text-3xl font-bold text-sky-400">{jobStats.pending}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">System Status</h2>
          <div className="grid gap-3">
            {systems.map((system) => {
              const config = STATUS_CONFIG[system.status];
              const Icon = SYSTEM_ICONS[system.system_name] ?? Activity;
              const total24h = system.success_count_24h + system.fail_count_24h;
              const successRate = total24h > 0 ? Math.round((system.success_count_24h / total24h) * 100) : 0;

              return (
                <div
                  key={system.system_name}
                  className={`${config.bg} border ${config.border} rounded-xl p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.dot} animate-pulse`} />
                      <Icon className={`w-5 h-5 ${config.text}`} />
                      <div>
                        <p className="font-medium text-sm">{system.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last run: {timeAgo(system.last_run_at)} | Success rate: {successRate}% ({total24h} runs)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <button
                        onClick={() => triggerSystem(system.system_name)}
                        disabled={triggering === system.system_name}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title="Manual Trigger"
                      >
                        <Play className={`w-4 h-4 ${triggering === system.system_name ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                  {system.last_error_message && system.status !== "green" && (
                    <p className="text-xs text-red-400 mt-2 truncate">
                      {system.last_error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Dead Letter Queue
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{dlqStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-sky-400">{dlqStats.retrying}</p>
                <p className="text-xs text-muted-foreground">Retrying</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{dlqStats.dead}</p>
                <p className="text-xs text-muted-foreground">Dead</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{dlqStats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Job Queue
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{jobStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-sky-400">{jobStats.processing}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{jobStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{jobStats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>
        </div>

        {readModelCards.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Read Model Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {readModelCards.map((card) => {
                const displayValue = Object.values(card.value)[0];
                return (
                  <div key={card.cardId} className={`bg-card rounded-xl border p-4 ${card.status === "error" ? "border-red-500/30" : card.status === "warning" ? "border-amber-500/30" : "border-border"}`}>
                    <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.status === "error" ? "text-red-400" : card.status === "warning" ? "text-amber-400" : "text-emerald-400"}`}>
                      {displayValue != null ? String(displayValue) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{card.status}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {anomalyEvents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Anomaly Events</h2>
            <div className="bg-card rounded-xl border border-border p-4 space-y-2 max-h-60 overflow-y-auto">
              {anomalyEvents.slice(0, 10).map((evt, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="font-medium">{evt.domain}</span>
                    <span className="text-muted-foreground">{evt.metric}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{evt.actionTaken}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dbHealth && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">DB Health</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dbHealth.criticalAlerts.length > 0 ? dbHealth.criticalAlerts.map((alertName, i) => (
                <div key={i} className="bg-card rounded-xl border border-red-500/30 p-3">
                  <p className="text-xs text-muted-foreground">Critical Alert</p>
                  <p className="text-lg font-bold text-red-400">{alertName}</p>
                </div>
              )) : (
                <div className="col-span-full bg-card rounded-xl border border-emerald-500/30 p-3 text-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs text-emerald-400">All DB metrics healthy ({dbHealth.alertCount} warnings)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {uptimeHistory.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Recent Uptime Checks
            </h3>
            <div className="flex gap-1 items-end h-8">
              {uptimeHistory.slice(0, 20).reverse().map((entry, i) => {
                const color = entry.status === "healthy" ? "bg-emerald-500" : entry.status === "degraded" ? "bg-amber-500" : "bg-red-500";
                return (
                  <div
                    key={i}
                    className={`flex-1 ${color} rounded-sm min-w-[4px]`}
                    style={{ height: `${Math.max(20, 100 - entry.total_ms / 10)}%` }}
                    title={`${entry.status} - ${entry.total_ms}ms - ${new Date(entry.created_at).toLocaleTimeString()}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
