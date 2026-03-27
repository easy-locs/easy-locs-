import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RuntimeQaRun = {
  id: string;
  scope: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  total_modules: number;
  total_scenarios: number;
  pass_count: number;
  fail_count: number;
  degraded_count: number;
  fixed_count: number;
  critical_count: number;
  warning_count: number;
  duration_ms: number | null;
  report_json: any;
};

type RuntimeQaScenario = {
  id: string;
  module_key: string;
  scenario_key: string;
  area: string;
  route_key: string | null;
  status: string;
  severity: string;
  issue_type: string | null;
  summary: string | null;
  auto_fix_applied: boolean;
  fix_summary: string | null;
  duration_ms: number;
};

type RuntimeQaWatchdog = {
  id: string;
  module_key: string;
  route_key: string;
  current_status: string;
  consecutive_failures: number;
  current_issue: string | null;
  last_seen_ok_at: string | null;
};

function timeAgo(ts?: string | null) {
  if (!ts) return "never";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function RuntimeQaPanel() {
  const [runs, setRuns] = useState<RuntimeQaRun[]>([]);
  const [scenarios, setScenarios] = useState<RuntimeQaScenario[]>([]);
  const [watchdog, setWatchdog] = useState<RuntimeQaWatchdog[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: runsData }, { data: watchdogData }] = await Promise.all([
      (supabase as any).from("runtime_qa_runs").select("*").order("started_at", { ascending: false }).limit(10),
      (supabase as any).from("runtime_qa_watchdog").select("*").order("module_key"),
    ]);

    setRuns((runsData ?? []) as RuntimeQaRun[]);
    setWatchdog((watchdogData ?? []) as RuntimeQaWatchdog[]);

    const latestRunId = (runsData ?? [])[0]?.id;
    if (latestRunId) {
      const { data: scenarioData } = await (supabase as any)
        .from("runtime_qa_scenarios")
        .select("*")
        .eq("run_id", latestRunId)
        .order("created_at", { ascending: false });

      setScenarios((scenarioData ?? []) as RuntimeQaScenario[]);
    } else {
      setScenarios([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const latest = runs[0];

  const stats = useMemo(() => {
    return {
      runs: runs.length,
      scenarios: latest?.total_scenarios ?? 0,
      pass: latest?.pass_count ?? 0,
      fail: latest?.fail_count ?? 0,
      fixed: latest?.fixed_count ?? 0,
      critical: latest?.critical_count ?? 0,
      failingRoutes: watchdog.filter((w) => w.current_status === "failing").length,
    };
  }, [runs, latest, watchdog]);

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading runtime QA...</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Master Runtime QA</h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Last Run</p>
          <p className="text-sm font-semibold text-foreground">{latest ? timeAgo(latest.started_at) : "never"}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Scenarios</p>
          <p className="text-sm font-semibold text-foreground">{stats.scenarios}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Pass</p>
          <p className="text-sm font-semibold text-foreground">{stats.pass}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Fail</p>
          <p className="text-sm font-semibold text-foreground">{stats.fail}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Fixed</p>
          <p className="text-sm font-semibold text-foreground">{stats.fixed}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Critical</p>
          <p className="text-sm font-semibold text-foreground">{stats.critical}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Failing Routes</p>
          <p className="text-sm font-semibold text-foreground">{stats.failingRoutes}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="text-sm font-semibold text-foreground">{latest?.duration_ms ? `${(latest.duration_ms / 1000).toFixed(1)}s` : "-"}</p>
        </div>
      </div>

      {/* Scenarios */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Scenarios (latest run)</p>
        {scenarios.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">
                {s.module_key} / {s.scenario_key}
              </p>
              {s.summary && <p className="text-xs text-muted-foreground">{s.summary}</p>}
              {s.fix_summary && <p className="text-xs text-muted-foreground">Fix: {s.fix_summary}</p>}
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <p className={`text-xs font-semibold ${s.status === "pass" ? "text-green-600" : s.status === "fail" ? "text-destructive" : "text-yellow-600"}`}>
                {s.status}
              </p>
              <p className="text-[10px] text-muted-foreground">{s.severity}</p>
              <p className="text-[10px] text-muted-foreground">{s.duration_ms}ms</p>
            </div>
          </div>
        ))}
        {scenarios.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No runtime QA data yet.</p>
        )}
      </div>

      {/* Watchdog */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Runtime QA Watchdog</p>
        {watchdog.map((w) => (
          <div key={w.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div>
              <p className="text-xs font-medium text-foreground">{w.module_key} → {w.route_key}</p>
              {w.current_issue && <p className="text-xs text-muted-foreground">{w.current_issue}</p>}
            </div>
            <div className="text-right space-y-0.5">
              <p className={`text-xs font-semibold ${w.current_status === "ok" ? "text-green-600" : "text-destructive"}`}>
                {w.current_status}
              </p>
              <p className="text-[10px] text-muted-foreground">{w.consecutive_failures} fails</p>
              <p className="text-[10px] text-muted-foreground">OK: {timeAgo(w.last_seen_ok_at)}</p>
            </div>
          </div>
        ))}
        {watchdog.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No watchdog data yet.</p>
        )}
      </div>
    </div>
  );
}
