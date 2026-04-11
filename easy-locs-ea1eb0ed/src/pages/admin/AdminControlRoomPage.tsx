import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity, CheckCircle, Clock, Cpu, Heart,
  RefreshCw, XCircle, Pause,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface EngineRow {
  engine_name: string;
  engine_tier: string;
  runtime_class: string;
  status: string;
  enabled: boolean;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  last_duration_ms: number | null;
  consecutive_failures: number;
  total_runs: number;
  total_rows_affected: number;
  success_rate: number;
  frequency_seconds: number | null;
  worker_group: string | null;
  description: string | null;
  kill_switch: boolean;
}

interface HealthSnapshot {
  id: string;
  snapshot_at: string;
  total_engines: number;
  healthy_count: number;
  stale_count: number;
  error_count: number;
  disabled_count: number;
  stale_engines: string[];
  error_engines: string[];
  avg_success_rate: number;
  total_runs_last_hour: number;
}

interface RunLog {
  id: string;
  engine_name: string;
  started_at: string;
  duration_ms: number | null;
  status: string;
  effect_summary: string | null;
  db_rows_affected: number;
  error_message: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "ok" ? "bg-emerald-500/20 text-emerald-400" :
    status === "running" ? "bg-blue-500/20 text-blue-400" :
    status === "error" ? "bg-red-500/20 text-red-400" :
    status === "disabled" ? "bg-gray-500/20 text-gray-400" :
    "bg-amber-500/20 text-amber-400";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{status}</span>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86400_000)}d ago`;
}

export default function AdminControlRoomPage() {
  const [tab, setTab] = useState<"overview" | "engines" | "logs" | "health">("overview");

  const { data: engines = [], refetch: refetchEngines } = useQuery({
    queryKey: ["control-room-engines"],
    queryFn: async () => {
      const { data, error } = await db("engine_supervisor").select("*").order("engine_name");
      if (error) throw error;
      return (data ?? []) as EngineRow[];
    },
    refetchInterval: 10_000,
  });

  const { data: healthSnaps = [], refetch: refetchHealth } = useQuery({
    queryKey: ["control-room-health"],
    queryFn: async () => {
      const { data, error } = await db("worker_health_snapshots")
        .select("*")
        .order("snapshot_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as HealthSnapshot[];
    },
    refetchInterval: 30_000,
  });

  const { data: recentLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["control-room-logs"],
    queryFn: async () => {
      const { data, error } = await db("engine_run_logs")
        .select("id, engine_name, started_at, duration_ms, status, effect_summary, db_rows_affected, error_message")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RunLog[];
    },
    refetchInterval: 15_000,
  });

  const totalEngines = engines.length;
  const enabledEngines = engines.filter(e => e.enabled);
  const okEngines = enabledEngines.filter(e => e.status === "ok");
  const errorEngines = enabledEngines.filter(e => e.status === "error");
  const disabledEngines = engines.filter(e => !e.enabled);
  const latestHealth = healthSnaps[0];

  const groups = new Map<string, EngineRow[]>();
  for (const e of engines) {
    const g = e.worker_group || "ungrouped";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(e);
  }

  const navItems = [
    { key: "overview" as const, label: "Overview", icon: Activity },
    { key: "engines" as const, label: "Engines", icon: Cpu },
    { key: "logs" as const, label: "Run Logs", icon: Clock },
    { key: "health" as const, label: "Health", icon: Heart },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(38 65% 56%)" }}>Control Room</h1>
            <p className="text-sm text-gray-400 mt-1">Unified system health and engine monitoring</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchEngines(); refetchHealth(); refetchLogs(); toast.success("Refreshed"); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="flex gap-2 border-b border-white/10 pb-2">
          {navItems.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === n.key ? "text-white" : "text-gray-400 hover:text-gray-200"
              }`}
              style={tab === n.key ? { backgroundColor: "hsl(220 40% 18%)" } : {}}
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Engines", value: totalEngines, icon: Cpu, color: "text-blue-400" },
                { label: "Healthy", value: okEngines.length, icon: CheckCircle, color: "text-emerald-400" },
                { label: "Errors", value: errorEngines.length, icon: XCircle, color: "text-red-400" },
                { label: "Disabled", value: disabledEngines.length, icon: Pause, color: "text-gray-400" },
              ].map(s => (
                <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className={`w-8 h-8 ${s.color}`} />
                    <div>
                      <p className="text-2xl font-bold text-white">{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {latestHealth && (
              <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
                    <Heart className="w-4 h-4 inline mr-1" /> Latest Health Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-sm">
                    <div><span className="text-gray-400">Healthy:</span> <span className="text-emerald-400 font-medium">{latestHealth.healthy_count}</span></div>
                    <div><span className="text-gray-400">Stale:</span> <span className="text-amber-400 font-medium">{latestHealth.stale_count}</span></div>
                    <div><span className="text-gray-400">Errors:</span> <span className="text-red-400 font-medium">{latestHealth.error_count}</span></div>
                    <div><span className="text-gray-400">Avg Rate:</span> <span className="text-blue-400 font-medium">{latestHealth.avg_success_rate}%</span></div>
                    <div><span className="text-gray-400">Runs/hr:</span> <span className="text-white font-medium">{latestHealth.total_runs_last_hour}</span></div>
                  </div>
                  {latestHealth.stale_engines.length > 0 && (
                    <div className="text-xs text-amber-400">Stale: {latestHealth.stale_engines.join(", ")}</div>
                  )}
                  {latestHealth.error_engines.length > 0 && (
                    <div className="text-xs text-red-400">Errors: {latestHealth.error_engines.join(", ")}</div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-300">Worker Groups</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...groups.entries()].sort().map(([group, items]) => (
                  <Card key={group} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: "hsl(38 65% 56%)" }}>{group}</span>
                        <Badge variant="outline" className="text-xs">{items.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {items.slice(0, 5).map(e => (
                          <div key={e.engine_name} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300 truncate max-w-[140px]">{e.engine_name}</span>
                            <StatusBadge status={e.enabled ? e.status : "disabled"} />
                          </div>
                        ))}
                        {items.length > 5 && <div className="text-xs text-gray-500">+{items.length - 5} more</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "engines" && (
          <div className="space-y-2">
            {engines.map(e => (
              <motion.div
                key={e.engine_name}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg border border-white/5"
                style={{ backgroundColor: "hsl(220 40% 14%)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={e.enabled ? e.status : "disabled"} />
                    <span className="text-sm font-medium text-white">{e.engine_name}</span>
                    {e.kill_switch && <Badge variant="destructive" className="text-xs">KILLED</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{e.total_runs} runs</span>
                    <span>{e.last_duration_ms ?? 0}ms</span>
                    <span>{timeAgo(e.last_run_at)}</span>
                  </div>
                </div>
                {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
                {e.last_error_message && (
                  <p className="text-xs text-red-400 mt-1 truncate max-w-xl">{e.last_error_message}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-1">
            {recentLogs.map(l => (
              <div
                key={l.id}
                className="p-2 rounded-lg flex items-center justify-between text-xs border border-white/5"
                style={{ backgroundColor: "hsl(220 40% 14%)" }}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={l.status} />
                  <span className="text-white font-medium">{l.engine_name}</span>
                  {l.effect_summary && <span className="text-gray-400 truncate max-w-[300px]">{l.effect_summary}</span>}
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>{l.db_rows_affected} rows</span>
                  <span>{l.duration_ms ?? 0}ms</span>
                  <span>{timeAgo(l.started_at)}</span>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && <p className="text-gray-500 text-sm">No recent logs</p>}
          </div>
        )}

        {tab === "health" && (
          <div className="space-y-3">
            {healthSnaps.map(s => (
              <Card key={s.id} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{new Date(s.snapshot_at).toLocaleString()}</span>
                    <span className="text-xs text-gray-500">{s.total_runs_last_hour} runs/hr</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-emerald-400 font-bold">{s.healthy_count}</p>
                      <p className="text-xs text-gray-500">Healthy</p>
                    </div>
                    <div className="text-center">
                      <p className="text-amber-400 font-bold">{s.stale_count}</p>
                      <p className="text-xs text-gray-500">Stale</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 font-bold">{s.error_count}</p>
                      <p className="text-xs text-gray-500">Error</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 font-bold">{s.disabled_count}</p>
                      <p className="text-xs text-gray-500">Disabled</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 font-bold">{s.avg_success_rate}%</p>
                      <p className="text-xs text-gray-500">Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {healthSnaps.length === 0 && <p className="text-gray-500 text-sm">No health snapshots yet</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
