import SubPageShell from "@/components/layout/SubPageShell";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import {
  listIncidents,
  listRecentTimeouts,
  previewStuckTasks,
  type IncidentRow,
  type RecentTimeoutRow,
  type StuckCandidate,
} from "@/core/execution/watchdog";

type Tab = "incidents" | "stuck" | "timeouts";

const SEVERITY_COLOR: Record<string, string> = {
  info: "text-foreground",
  warn: "text-amber-500",
  error: "text-destructive",
  critical: "text-destructive font-bold",
};

export default function AdminWatchdogPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("incidents");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [stuck, setStuck] = useState<StuckCandidate[]>([]);
  const [timeouts, setTimeouts] = useState<RecentTimeoutRow[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [iRes, sRes, tRes] = await Promise.all([
      listIncidents(200),
      previewStuckTasks(50),
      listRecentTimeouts(100),
    ]);
    if (iRes.error) setError(iRes.error);
    else setIncidents(iRes.rows);
    if (sRes.error && !iRes.error) setError(sRes.error);
    else if (!sRes.error) setStuck(sRes.rows);
    if (tRes.error && !iRes.error && !sRes.error) setError(tRes.error);
    else if (!tRes.error) setTimeouts(tRes.rows);
    setLastRefreshed(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats = [
    {
      label: "Live incidents",
      value: incidents.length,
      icon: Activity,
      color: "text-foreground",
    },
    {
      label: "Stuck candidates",
      value: stuck.length,
      icon: AlertTriangle,
      color: stuck.length > 0 ? "text-amber-500" : "text-foreground",
    },
    {
      label: "Recent timeouts",
      value: timeouts.length,
      icon: Clock,
      color: timeouts.length > 0 ? "text-destructive" : "text-foreground",
    },
  ];

  return (
    <SubPageShell noContentPad className="bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/30">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 rounded-2xl bg-muted flex items-center justify-center hover:bg-muted/70 active:scale-[0.98] transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">
            Watchdog &amp; Anti-Deadlock
          </h1>
          <p className="text-[0.625rem] text-muted-foreground">
            Live execution-task watchdog: incidents, stuck candidates, recent timeouts
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {stats.map((s) => (
            <AppCard key={s.label} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="text-[0.625rem] text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </span>
              </div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </AppCard>
          ))}
        </div>

        {error && (
          <AppCard className="p-3 mb-4 border-destructive/40">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-xs text-destructive">{error}</div>
            </div>
          </AppCard>
        )}

        <div className="flex items-center gap-1 border-b border-border/30 mb-3">
          {(["incidents", "stuck", "timeouts"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "incidents" && `Incident log (${incidents.length})`}
              {t === "stuck" && `Stuck candidates (${stuck.length})`}
              {t === "timeouts" && `Recent timeouts (${timeouts.length})`}
            </button>
          ))}
        </div>

        {tab === "incidents" && <IncidentsTable rows={incidents} />}
        {tab === "stuck" && <StuckTable rows={stuck} />}
        {tab === "timeouts" && <TimeoutsTable rows={timeouts} />}

        {lastRefreshed && (
          <p className="text-[0.625rem] text-muted-foreground mt-3 text-right">
            Last refreshed: {lastRefreshed.toLocaleTimeString()} — auto-refresh every 30s
          </p>
        )}
      </div>
    </SubPageShell>
  );
}

function IncidentsTable({ rows }: { rows: IncidentRow[] }) {
  if (rows.length === 0) {
    return (
      <AppCard className="p-6 text-center">
        <p className="text-xs text-muted-foreground">No incidents recorded yet.</p>
      </AppCard>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <AppCard key={r.id} className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${SEVERITY_COLOR[r.severity] ?? ""}`}>
                {r.severity.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-foreground">{r.kind}</span>
            </div>
            <span className="text-[0.625rem] text-muted-foreground">
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>
          <div className="text-[0.625rem] text-muted-foreground mb-1">
            actor: {r.actor}
            {r.related_task_id && ` · task: ${r.related_task_id.slice(0, 8)}…`}
          </div>
          <pre className="text-[0.625rem] bg-muted/40 p-2 rounded overflow-x-auto max-h-32">
            {JSON.stringify(r.evidence_json, null, 2)}
          </pre>
        </AppCard>
      ))}
    </div>
  );
}

function StuckTable({ rows }: { rows: StuckCandidate[] }) {
  if (rows.length === 0) {
    return (
      <AppCard className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          No stuck task candidates right now. The watchdog is healthy.
        </p>
      </AppCard>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <AppCard key={`${r.task_id}-${r.rule}`} className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="text-xs font-mono text-foreground">{r.task_type}</span>
              <span className="text-[0.625rem] text-muted-foreground ml-2">
                {r.domain} · status={r.status} · attempts={r.attempt_count ?? 0}/
                {r.max_attempts ?? "?"}
              </span>
            </div>
            <span className="text-[0.625rem] font-bold text-amber-500">{r.rule}</span>
          </div>
          <div className="text-[0.625rem] text-muted-foreground mb-1">
            task: {r.task_id.slice(0, 8)}…
          </div>
          <pre className="text-[0.625rem] bg-muted/40 p-2 rounded overflow-x-auto max-h-32">
            {JSON.stringify(r.evidence, null, 2)}
          </pre>
        </AppCard>
      ))}
    </div>
  );
}

function TimeoutsTable({ rows }: { rows: RecentTimeoutRow[] }) {
  if (rows.length === 0) {
    return (
      <AppCard className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          No recent timeouts. All tasks completed within their declared budget.
        </p>
      </AppCard>
    );
  }
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <AppCard key={r.id} className="p-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-destructive flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-foreground truncate">{r.type}</div>
            <div className="text-[0.625rem] text-muted-foreground">
              {r.domain} · class={r.failure_class ?? "?"} · attempts={r.attempt_count ?? 0}
            </div>
          </div>
          <span className="text-[0.625rem] text-muted-foreground flex-shrink-0">
            {r.failed_at ? new Date(r.failed_at).toLocaleString() : "—"}
          </span>
        </AppCard>
      ))}
    </div>
  );
}
