/**
 * BrowserRepairLivePanel — Admin panel showing real browser repair runs and front incidents.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RepairRun {
  id: string;
  created_at: string;
  status: string;
  scenario_count: number;
  pass_count: number;
  fail_count: number;
  fixed_count: number;
}

interface FrontIncident {
  id: string;
  created_at: string;
  route_key: string | null;
  flow_key: string | null;
  issue_type: string;
  severity: string;
  title: string;
  summary: string | null;
  hit_count: number;
  status: string;
}

export default function BrowserRepairLivePanel() {
  const [runs, setRuns] = useState<RepairRun[]>([]);
  const [incidents, setIncidents] = useState<FrontIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    const [{ data: runsData }, { data: incidentsData }] = await Promise.all([
      (supabase as any)
        .from("browser_repair_runs")
        .select("id, created_at, status, scenario_count, pass_count, fail_count, fixed_count")
        .order("created_at", { ascending: false })
        .limit(15),
      (supabase as any)
        .from("browser_front_incidents")
        .select("id, created_at, route_key, flow_key, issue_type, severity, title, summary, hit_count, status")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);
    setRuns((runsData ?? []) as RepairRun[]);
    setIncidents((incidentsData ?? []) as FrontIncident[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => ({
    runs: runs.length,
    issues: incidents.length,
    critical: incidents.filter((i) => i.severity === "critical").length,
    open: incidents.filter((i) => i.status === "open").length,
  }), [incidents, runs.length]);

  const filtered = useMemo(() => {
    if (filter === "all") return incidents;
    if (filter === "critical") return incidents.filter(i => i.severity === "critical");
    if (filter === "open") return incidents.filter(i => i.status === "open");
    return incidents.filter(i => i.route_key === filter || i.issue_type === filter);
  }, [incidents, filter]);

  if (loading) return <div className="p-4 text-muted-foreground text-sm">Loading browser repair panel...</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Runs", value: stats.runs, color: "text-foreground" },
          { label: "Incidents", value: stats.issues, color: "text-foreground" },
          { label: "Critical", value: stats.critical, color: "text-destructive" },
          { label: "Open", value: stats.open, color: "text-orange-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "critical", "open", "orbit", "wallet", "travel", "marketplace", "onboarding", "runtime_error", "action_timeout", "promise_rejection"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Latest Runs */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Latest Browser Repair Runs</h3>
        <div className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${run.status === "clean" ? "bg-green-500/10 text-green-600" : run.status === "issues_found" ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-600"}`}>
                  {run.status}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                scenarios={run.scenario_count} pass={run.pass_count} fail={run.fail_count} fixed={run.fixed_count}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Front Incidents */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Live Front Incidents ({filtered.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.map((incident) => (
            <div key={incident.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${incident.severity === "critical" ? "text-destructive" : incident.severity === "warning" ? "text-orange-500" : "text-muted-foreground"}`}>
                  [{incident.severity}] {incident.title}
                </span>
                <span className="text-xs text-muted-foreground">{incident.hit_count} hits</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                route={incident.route_key ?? "-"} flow={incident.flow_key ?? "-"} issue={incident.issue_type}
              </p>
              {incident.summary && <p className="text-xs text-muted-foreground/70 mt-0.5 break-words leading-snug">{incident.summary}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
