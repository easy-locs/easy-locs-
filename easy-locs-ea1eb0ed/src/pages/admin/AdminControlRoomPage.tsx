import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity, CheckCircle, Clock, Cpu, Heart,
  RefreshCw, XCircle, Pause, Shield, Wrench,
  AlertTriangle, ArrowRight, Layers, Eye, Monitor,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { engineObserver } from "@/engines/core/engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";
import { SOURCE_FIX_REGISTRY, RUNTIME_PATCH_TYPES, UI_ENGINE_PAGES } from "@/lib/control-room/source-fix-config";

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
  metadata_json?: Record<string, unknown>;
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
  metadata_json?: Record<string, unknown>;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "ok" ? "bg-emerald-500/20 text-emerald-400" :
    status === "running" ? "bg-blue-500/20 text-blue-400" :
    status === "error" ? "bg-red-500/20 text-red-400" :
    status === "warning" ? "bg-amber-500/20 text-amber-400" :
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

type TabKey = "overview" | "engines" | "logs" | "health" | "core" | "fixes";

interface UiEnginePageReport {
  route: string;
  score: number;
  issueCount: number;
  patchCount: number;
  timestamp: number;
}

export default function AdminControlRoomPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [uiReports, setUiReports] = useState<Map<string, UiEnginePageReport>>(new Map());

  const handleUiReport = useCallback((report: UiEnginePageReport) => {
    setUiReports(prev => {
      const next = new Map(prev);
      next.set(report.route, report);
      return next;
    });
  }, []);

  useEffect(() => {
    const unsub = platformBus.on("ui-engine:report" as Parameters<typeof platformBus.on>[0], handleUiReport as Parameters<typeof platformBus.on>[1]);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [handleUiReport]);

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
        .select("id, engine_name, started_at, duration_ms, status, effect_summary, db_rows_affected, error_message, metadata_json")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RunLog[];
    },
    refetchInterval: 15_000,
  });

  const browserReport = useMemo(() => engineObserver.getReport(), [engines]);

  const totalEngines = engines.length;
  const enabledEngines = engines.filter(e => e.enabled);
  const serverEngines = engines.filter(e => e.runtime_class === "server");
  const browserEngines = engines.filter(e => e.runtime_class !== "server");
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

  const topFailers = [...engines]
    .filter(e => e.consecutive_failures > 0)
    .sort((a, b) => b.consecutive_failures - a.consecutive_failures)
    .slice(0, 5);

  const topImpact = [...engines]
    .sort((a, b) => b.total_rows_affected - a.total_rows_affected)
    .slice(0, 5);

  const driftLogs = recentLogs.filter(l => l.engine_name === "source-of-truth-drift" && l.status === "warning");
  const fraudLogs = recentLogs.filter(l => l.engine_name === "fraud-anomaly-scan" && (l.db_rows_affected ?? 0) > 0);
  const trustLogs = recentLogs.filter(l => l.engine_name === "trust-ranking-recompute" && (l.db_rows_affected ?? 0) > 0);
  const blockedPublishes = recentLogs.filter(l =>
    l.engine_name.includes("publish-gate") && l.effect_summary?.toLowerCase().includes("block")
  );
  const orphanCleanupLogs = recentLogs.filter(l => l.engine_name === "orphan-entity-cleanup");
  const staleFlowLogs = recentLogs.filter(l => l.engine_name === "stale-flow-detection");

  const SENTINEL_BACKEND_ENGINES = ["source-of-truth-drift", "pricing-integrity", "availability-integrity", "health-monitor", "incident-classify", "stale-flow-detection"];
  const sentinelEngines = engines.filter(e => SENTINEL_BACKEND_ENGINES.includes(e.engine_name));
  const sentinelLogs = recentLogs.filter(l => SENTINEL_BACKEND_ENGINES.includes(l.engine_name));

  const permanentFixes = SOURCE_FIX_REGISTRY.filter(f => f.status === "fixed").length;
  const runtimeOnly = SOURCE_FIX_REGISTRY.filter(f => f.status === "runtime_only").length;
  const permanentPatchTypes = RUNTIME_PATCH_TYPES.filter(p => p.permanent).length;
  const runtimePatchTypes = RUNTIME_PATCH_TYPES.filter(p => !p.permanent).length;

  const navItems = [
    { key: "overview" as const, label: "Overview", icon: Activity },
    { key: "core" as const, label: "Core Status", icon: Shield },
    { key: "engines" as const, label: "Engines", icon: Cpu },
    { key: "fixes" as const, label: "Source Fixes (Reference)", icon: Wrench },
    { key: "logs" as const, label: "Run Logs", icon: Clock },
    { key: "health" as const, label: "Health", icon: Heart },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(38 65% 56%)" }}>Control Room</h1>
            <p className="text-sm text-gray-400 mt-1">Permanent system health, source fixes, and engine monitoring</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchEngines(); refetchHealth(); refetchLogs(); toast.success("Refreshed"); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="flex gap-1.5 flex-wrap border-b border-white/10 pb-2">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
                    <Shield className="w-4 h-4 inline mr-1" /> Permanent vs Runtime
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Backend workers</span><span className="text-emerald-400 font-bold">{serverEngines.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Browser monitors</span><span className="text-amber-400 font-bold">{browserEngines.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Source fixes</span><span className="text-emerald-400 font-bold">{permanentFixes}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Runtime-only</span><span className="text-amber-400 font-bold">{runtimeOnly}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Patch types permanent</span><span className="text-emerald-400 font-bold">{permanentPatchTypes}/{RUNTIME_PATCH_TYPES.length}</span></div>
                </CardContent>
              </Card>

              <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
                    <Monitor className="w-4 h-4 inline mr-1" /> Browser Engine Observer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Active browser engines</span><span className="text-blue-400 font-bold">{browserReport.totalEngines}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Total ticks</span><span className="text-white font-bold">{browserReport.totalTicks}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Total findings</span><span className="text-amber-400 font-bold">{browserReport.totalFindings}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Total actions</span><span className="text-emerald-400 font-bold">{browserReport.totalActions}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Browser errors</span><span className="text-red-400 font-bold">{browserReport.totalErrors}</span></div>
                </CardContent>
              </Card>

              {latestHealth && (
                <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
                      <Heart className="w-4 h-4 inline mr-1" /> Latest Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Healthy</span><span className="text-emerald-400 font-bold">{latestHealth.healthy_count}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Stale</span><span className="text-amber-400 font-bold">{latestHealth.stale_count}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Errors</span><span className="text-red-400 font-bold">{latestHealth.error_count}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Success rate</span><span className="text-blue-400 font-bold">{latestHealth.avg_success_rate}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Runs/hour</span><span className="text-white font-bold">{latestHealth.total_runs_last_hour}</span></div>
                  </CardContent>
                </Card>
              )}
            </div>

            {(driftLogs.length > 0 || fraudLogs.length > 0 || blockedPublishes.length > 0) && (
              <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
                    <AlertTriangle className="w-4 h-4 inline mr-1" /> Recent Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {driftLogs.slice(0, 3).map(l => (
                    <div key={l.id} className="text-amber-400"><ArrowRight className="w-3 h-3 inline mr-1" />{l.effect_summary}</div>
                  ))}
                  {fraudLogs.slice(0, 3).map(l => (
                    <div key={l.id} className="text-red-400"><ArrowRight className="w-3 h-3 inline mr-1" />{l.effect_summary}</div>
                  ))}
                  {blockedPublishes.slice(0, 3).map(l => (
                    <div key={l.id} className="text-orange-400"><ArrowRight className="w-3 h-3 inline mr-1" />{l.effect_summary}</div>
                  ))}
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

        {tab === "core" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400"><Layers className="w-4 h-4 inline mr-1" />What works permanently</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-xs text-gray-300">
                  <div>{serverEngines.length} backend ENGINE_ACTIONS in run-engine-cron (24/7)</div>
                  <div>{totalEngines} total engine registrations</div>
                  <div>{permanentFixes} source-code fixes permanently applied</div>
                  <div>{permanentPatchTypes}/{RUNTIME_PATCH_TYPES.length} runtime patch types eliminated by CSS</div>
                  <div>{okEngines.length} engines healthy right now</div>
                </CardContent>
              </Card>

              <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-400"><AlertTriangle className="w-4 h-4 inline mr-1" />What remains temporary</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-xs text-gray-300">
                  <div>Dotted i18n label patching (runtime titleize only)</div>
                  <div>Untranslated key replacement (needs i18n file updates)</div>
                  <div>Element overlap resolution (per-component manual fix needed)</div>
                  <div>Sentinel/God/Omega browser loops (stop with tab close)</div>
                  <div>{browserEngines.length} browser-class engines (observers, not critical writers)</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}><Eye className="w-4 h-4 inline mr-1" /> UI Engine Coverage (useUiEngine — Live)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {UI_ENGINE_PAGES.map(p => {
                    const liveReport = uiReports.get(p.route);
                    return (
                      <div key={p.route} className="text-xs p-2 rounded border border-white/5" style={{ backgroundColor: "hsl(220 40% 18%)" }}>
                        <span className="text-white font-medium">{p.name}</span>
                        <div className="text-gray-500 mt-0.5 font-mono text-[10px]">{p.route}</div>
                        {liveReport ? (
                          <div className="mt-1 space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Score</span>
                              <span className={liveReport.score >= 80 ? "text-emerald-400" : liveReport.score >= 50 ? "text-amber-400" : "text-red-400"}>
                                {liveReport.score}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Issues</span>
                              <span className={liveReport.issueCount === 0 ? "text-emerald-400" : "text-amber-400"}>{liveReport.issueCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Patches</span>
                              <span className="text-blue-400">{liveReport.patchCount}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-gray-600">awaiting report</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}><Monitor className="w-4 h-4 inline mr-1" /> Browser Engine Observer (Live)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-3">
                  <div className="text-center">
                    <p className="text-blue-400 font-bold">{browserReport.totalEngines}</p>
                    <p className="text-xs text-gray-500">Active Engines</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">{browserReport.totalTicks}</p>
                    <p className="text-xs text-gray-500">Total Ticks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-amber-400 font-bold">{browserReport.totalFindings}</p>
                    <p className="text-xs text-gray-500">Findings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 font-bold">{browserReport.totalActions}</p>
                    <p className="text-xs text-gray-500">Actions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-400 font-bold">{browserReport.totalErrors}</p>
                    <p className="text-xs text-gray-500">Errors</p>
                  </div>
                </div>
                {browserReport.engines.length > 0 && (
                  <div className="space-y-1">
                    {browserReport.engines.slice(0, 10).map(e => (
                      <div key={e.engineId} className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium">{e.engineId}</span>
                        <div className="flex items-center gap-3 text-gray-400">
                          <span>{e.tickCount} ticks</span>
                          <span>{e.totalFindings} findings</span>
                          <span>{e.totalActions} actions</span>
                          <span className={e.errorCount > 0 ? "text-red-400" : "text-gray-500"}>{e.errorCount} errors</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {browserReport.recentLogs.length > 0 && (
                  <div className="mt-3 border-t border-white/5 pt-2">
                    <p className="text-xs text-gray-500 mb-1">Recent browser engine logs</p>
                    {browserReport.recentLogs.slice(-5).map((l, i) => (
                      <div key={i} className={`text-[10px] font-mono ${l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-400" : "text-gray-500"}`}>
                        [{l.category}/{l.engineId}] {l.message}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>Top Impact Workers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topImpact.map(e => (
                    <div key={e.engine_name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={e.enabled ? e.status : "disabled"} />
                        <span className="text-white font-medium">{e.engine_name}</span>
                      </div>
                      <span className="text-gray-400">{e.total_rows_affected} rows affected</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {topFailers.length > 0 && (
              <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">Workers with Failures</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topFailers.map(e => (
                      <div key={e.engine_name} className="flex items-center justify-between text-xs">
                        <span className="text-white">{e.engine_name}</span>
                        <div className="flex items-center gap-3 text-gray-400">
                          <span className="text-red-400">{e.consecutive_failures} failures</span>
                          <span>{e.success_rate}% rate</span>
                          <span className="truncate max-w-[200px]">{e.last_error_message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(orphanCleanupLogs.length > 0 || staleFlowLogs.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {orphanCleanupLogs.length > 0 && (
                  <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-400">Orphan Cleanup Progress</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-xs">
                      {orphanCleanupLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="text-gray-300">{l.db_rows_affected} orphans cleaned — {l.effect_summary} <span className="text-gray-500">{timeAgo(l.started_at)}</span></div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {staleFlowLogs.length > 0 && (
                  <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-400">Stale Flow Detection</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-xs">
                      {staleFlowLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="text-gray-300">{l.db_rows_affected} stale flows expired — {l.effect_summary} <span className="text-gray-500">{timeAgo(l.started_at)}</span></div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {(trustLogs.length > 0 || fraudLogs.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trustLogs.length > 0 && (
                  <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-400">Latest Trust Recomputes</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-xs">
                      {trustLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="text-gray-300">{l.effect_summary} <span className="text-gray-500">{timeAgo(l.started_at)}</span></div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {fraudLogs.length > 0 && (
                  <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">Latest Fraud Flags</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-xs">
                      {fraudLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="text-gray-300">{l.effect_summary} <span className="text-gray-500">{timeAgo(l.started_at)}</span></div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}><Shield className="w-4 h-4 inline mr-1" /> Sentinel Cron History (Backend Workers)</CardTitle></CardHeader>
              <CardContent>
                {sentinelEngines.length === 0 ? (
                  <p className="text-xs text-gray-500">No Sentinel workers registered yet.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {sentinelEngines.map(e => (
                        <div key={e.engine_name} className="text-xs p-2 rounded border border-white/5" style={{ backgroundColor: "hsl(220 40% 18%)" }}>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={e.enabled ? e.status : "disabled"} />
                            <span className="text-white font-medium">{e.engine_name}</span>
                          </div>
                          <div className="text-gray-500 mt-1">{e.success_rate}% success · {e.total_runs} runs · {timeAgo(e.last_run_at)}</div>
                        </div>
                      ))}
                    </div>
                    {sentinelLogs.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Recent Activity</p>
                        {sentinelLogs.slice(0, 8).map(l => (
                          <div key={l.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={l.status} />
                              <span className="text-white">{l.engine_name}</span>
                            </div>
                            <span className="text-gray-500">{l.effect_summary ?? l.status} · {timeAgo(l.started_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusBadge status={e.enabled ? e.status : "disabled"} />
                    <span className="text-sm font-medium text-white">{e.engine_name}</span>
                    {e.runtime_class === "server" && <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">backend</Badge>}
                    {e.kill_switch && <Badge variant="destructive" className="text-xs">KILLED</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{e.total_runs} runs</span>
                    <span>{e.total_rows_affected} rows</span>
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

        {tab === "fixes" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-2 text-sm text-amber-300">
              <Eye size={14} />
              <span>Documentation Reference — All fixes are permanently applied in source code. This tab is a read-only audit trail.</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Source Fixes", value: permanentFixes, color: "text-emerald-400" },
                { label: "Runtime Only", value: runtimeOnly, color: "text-amber-400" },
                { label: "Patch Types Permanent", value: permanentPatchTypes, color: "text-emerald-400" },
                { label: "Patch Types Runtime", value: runtimePatchTypes, color: "text-amber-400" },
              ].map(s => (
                <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>Source Fix Registry</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SOURCE_FIX_REGISTRY.map(f => (
                    <div key={f.id} className="flex items-start gap-2 text-xs border-b border-white/5 pb-2">
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${f.status === "fixed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{f.id}</span>
                          <span className="text-white font-medium">{f.issue}</span>
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {f.component} — {f.fixType} — <span className="font-mono text-gray-400">{f.cssRule}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>Runtime Patch Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {RUNTIME_PATCH_TYPES.map(p => (
                    <div key={p.type} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${p.permanent ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-white font-mono">{p.type}</span>
                      </div>
                      <span className="text-gray-400">{p.note}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                <div className="flex items-center gap-2 min-w-0">
                  <StatusBadge status={l.status} />
                  <span className="text-white font-medium">{l.engine_name}</span>
                  {l.effect_summary && <span className="text-gray-400 truncate max-w-[300px]">{l.effect_summary}</span>}
                </div>
                <div className="flex items-center gap-3 text-gray-500 shrink-0">
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
