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
  Zap, RotateCcw, TrendingDown, AlertCircle, Brain,
} from "lucide-react";
import { toast } from "sonner";
import { engineObserver } from "@/engines/core/engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";
import { engineOrchestrator } from "@/engines/core/engine-orchestrator";
import { SOURCE_FIX_REGISTRY, RUNTIME_PATCH_TYPES, UI_ENGINE_PAGES } from "@/lib/control-room/source-fix-config";
import { GovernancePanel } from "./GovernancePanel";
import { EngineMemoryPanel } from "./EngineMemoryPanel";

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

type TabKey = "overview" | "engines" | "logs" | "health" | "core" | "fixes" | "governance" | "memory" | "runtime";

interface UiEnginePageReport {
  route: string;
  score: number;
  issueCount: number;
  patchCount: number;
  timestamp: number;
}

function timeAgoMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export default function AdminControlRoomPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [uiReports, setUiReports] = useState<Map<string, UiEnginePageReport>>(new Map());
  const [runtimeStats, setRuntimeStats] = useState<ReturnType<typeof engineOrchestrator.getEngineRuntimeStats> | null>(null);

  const handleUiReport = useCallback((report: UiEnginePageReport) => {
    setUiReports(prev => {
      const next = new Map(prev);
      next.set(report.route, report);
      return next;
    });
  }, []);

  useEffect(() => {
    const unsub = platformBus.on("ui-engine:report", (event) => {
      handleUiReport(event.payload as UiEnginePageReport);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [handleUiReport]);

  useEffect(() => {
    const refresh = () => setRuntimeStats(engineOrchestrator.getEngineRuntimeStats());
    refresh();
    const interval = setInterval(refresh, 5_000);
    return () => clearInterval(interval);
  }, []);

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
    { key: "runtime" as const, label: "Runtime 24/7", icon: Zap },
    { key: "core" as const, label: "Core Status", icon: Shield },
    { key: "engines" as const, label: "Engines", icon: Cpu },
    { key: "fixes" as const, label: "Source Fixes (Reference)", icon: Wrench },
    { key: "logs" as const, label: "Run Logs", icon: Clock },
    { key: "health" as const, label: "Health", icon: Heart },
    { key: "governance" as const, label: "Governance", icon: Layers },
    { key: "memory" as const, label: "Engine Memory", icon: Brain },
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
                  <p className="text-[10px] text-gray-500 mt-1">Static audit reference — not live telemetry</p>
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

            <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
                  <Layers className="w-4 h-4 inline mr-1" /> Engine Tier Summary
                </CardTitle>
                <p className="text-[10px] text-gray-500 mt-1">Live from engine_supervisor — {engines.length} engines</p>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {(() => {
                  const tiers = new Map<string, EngineRow[]>();
                  engines.forEach(e => {
                    const tier = e.engine_tier || "unclassified";
                    if (!tiers.has(tier)) tiers.set(tier, []);
                    tiers.get(tier)!.push(e);
                  });
                  return [...tiers.entries()].sort().map(([tier, items]) => {
                    const okCount = items.filter(e => e.enabled && e.status === "ok").length;
                    const errorCount = items.filter(e => e.status === "error").length;
                    const disabledCount = items.filter(e => !e.enabled).length;
                    return (
                      <div key={tier} className="flex items-center justify-between gap-2">
                        <span className="text-gray-300 truncate max-w-[45%] capitalize">{tier.replace(/_/g, " ")}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">{okCount}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-gray-300">{items.length}</span>
                          {errorCount > 0 && <span className="text-red-400 text-[10px]">({errorCount} err)</span>}
                          {disabledCount > 0 && <span className="text-gray-500 text-[10px]">({disabledCount} off)</span>}
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>

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

        {tab === "governance" && <GovernancePanel />}

        {tab === "memory" && <EngineMemoryPanel />}

        {tab === "runtime" && <RuntimeEnginePanel runtimeStats={runtimeStats} />}
      </div>
    </DashboardLayout>
  );
}

interface RuntimeEnginePanelProps {
  runtimeStats: ReturnType<typeof engineOrchestrator.getEngineRuntimeStats> | null;
}

function RuntimeEnginePanel({ runtimeStats }: RuntimeEnginePanelProps) {
  const now = Date.now();

  if (!runtimeStats) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        <Cpu className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Engine runtime data not available — orchestrator may not be booted.
      </div>
    );
  }

  const { engines, health, scheduler, storm, optimizer, recentIncidents } = runtimeStats;

  function statusBg(status: string): string {
    switch (status) {
      case "running": return "bg-emerald-500/15 text-emerald-400";
      case "crashed": return "bg-red-500/15 text-red-400";
      case "frozen": return "bg-orange-500/15 text-orange-400";
      case "restarting": return "bg-blue-500/15 text-blue-400";
      case "safe_mode": return "bg-purple-500/15 text-purple-400";
      default: return "bg-gray-500/15 text-gray-400";
    }
  }

  function incidentColor(type: string): string {
    switch (type) {
      case "crash": return "text-red-400";
      case "freeze": return "text-orange-400";
      case "timeout": return "text-amber-400";
      case "restart": return "text-blue-400";
      case "safe_mode": return "text-purple-400";
      default: return "text-gray-400";
    }
  }

  const globalHealthScore = health.healthScore;
  const correctionsPerMin = storm.globalCorrectionsPerMinute;
  const isStormActive = storm.globallyPaused;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Engines", value: `${health.running}/${health.totalEngines}`, icon: Zap, color: "text-emerald-400" },
          { label: "Health Score", value: `${globalHealthScore}%`, icon: Heart, color: globalHealthScore >= 80 ? "text-emerald-400" : globalHealthScore >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Corrections/min", value: correctionsPerMin, icon: RotateCcw, color: isStormActive ? "text-red-400" : "text-amber-400" },
          { label: "Safe Mode", value: health.safeModes, icon: Shield, color: health.safeModes > 0 ? "text-purple-400" : "text-gray-500" },
        ].map(s => (
          <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-7 h-7 ${s.color}`} />
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(health.crashed > 0 || health.frozen > 0 || isStormActive) && (
        <Card className="border-red-500/20" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400">
              <AlertCircle className="w-4 h-4 inline mr-1" /> Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {health.crashed > 0 && (
              <div className="text-red-400"><XCircle className="w-3 h-3 inline mr-1" />{health.crashed} engine(s) crashed</div>
            )}
            {health.frozen > 0 && (
              <div className="text-orange-400"><AlertTriangle className="w-3 h-3 inline mr-1" />{health.frozen} engine(s) frozen</div>
            )}
            {isStormActive && (
              <div className="text-purple-400"><Shield className="w-3 h-3 inline mr-1" />Global storm pause active — non-critical engines paused until {storm.globalPausedUntil ? new Date(storm.globalPausedUntil).toLocaleTimeString() : "—"}</div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Activity className="w-4 h-4 inline mr-1" /> Scheduler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={scheduler.enabled ? "text-emerald-400" : "text-gray-500"}>{scheduler.enabled ? "Active" : "Stopped"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total scheduled</span><span className="text-white">{scheduler.totalScheduled}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Avg tick</span><span className="text-white">{scheduler.avgTickDurationMs}ms</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Active locks</span><span className="text-amber-400">{scheduler.activeDomainLocks.length}</span></div>
            {Object.entries(scheduler.byFrequency || {}).map(([freq, count]) => (
              <div key={freq} className="flex justify-between text-[10px]"><span className="text-gray-500 capitalize">{freq}</span><span className="text-gray-300">{String(count)}</span></div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Shield className="w-4 h-4 inline mr-1" /> Storm Guard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={isStormActive ? "text-red-400 font-bold" : "text-emerald-400"}>{storm.status}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Corrections/min</span><span className={correctionsPerMin > storm.globalThreshold * 0.7 ? "text-amber-400" : "text-white"}>{correctionsPerMin}/{storm.globalThreshold}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Critical engines</span><span className="text-blue-400">{(storm.criticalEngines || []).length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Per-engine limit</span><span className="text-gray-300">{storm.limits?.perEnginePerMinute}/min</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Loop detection</span><span className="text-gray-300">{storm.limits?.loopDetectionCount}x in {(storm.limits?.loopDetectionWindowMs ?? 0) / 1000}s</span></div>
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <TrendingDown className="w-4 h-4 inline mr-1" /> Optimizer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Last run</span><span className="text-white">{optimizer.lastRunAt ? timeAgoMs(now - optimizer.lastRunAt) : "Never"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Actions taken</span><span className="text-amber-400">{optimizer.totalActions}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Slow tick threshold</span><span className="text-gray-300">{optimizer.thresholds?.slowTickMs}ms</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Error rate threshold</span><span className="text-gray-300">{optimizer.thresholds?.highErrorRatePercent}%</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Cpu className="w-4 h-4 inline mr-1" /> All Engines — Real-time Status
          </CardTitle>
          <p className="text-[10px] text-gray-500 mt-1">Auto-refreshes every 5 seconds</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-500">
                  <th className="text-left py-2 pr-4">Engine</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Last Tick</th>
                  <th className="text-left py-2 pr-4">Success Rate</th>
                  <th className="text-left py-2 pr-4">Avg Tick</th>
                  <th className="text-left py-2 pr-4">Restarts</th>
                  <th className="text-left py-2 pr-4">Auto-Fixes</th>
                  <th className="text-left py-2 pr-4">Priority</th>
                  <th className="text-left py-2">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {engines.length === 0 && (
                  <tr><td colSpan={9} className="py-4 text-center text-gray-500">No engines registered</td></tr>
                )}
                {engines.map(engine => {
                  const lastTickAgo = engine.lastTick > 0 ? now - engine.lastTick : null;
                  const successRatePct = Math.round(engine.successRate * 100);
                  return (
                    <tr key={engine.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="py-2 pr-4">
                        <div className="font-medium text-white truncate max-w-[160px]">{engine.name}</div>
                        <div className="text-gray-500 text-[10px]">{engine.domain}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBg(engine.status)}`}>
                          {engine.status}
                        </span>
                        {engine.inSafeMode && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-400">safe</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {lastTickAgo !== null
                          ? <span className={lastTickAgo > engine.intervalMs * 3 ? "text-amber-400" : "text-gray-300"}>{timeAgoMs(lastTickAgo)}</span>
                          : <span className="text-gray-600">never</span>
                        }
                      </td>
                      <td className="py-2 pr-4">
                        <span className={successRatePct >= 80 ? "text-emerald-400" : successRatePct >= 50 ? "text-amber-400" : "text-red-400"}>
                          {engine.tickCount > 0 ? `${successRatePct}%` : "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={engine.avgTickDurationMs > 500 ? "text-amber-400" : "text-gray-300"}>
                          {engine.avgTickDurationMs > 0 ? `${engine.avgTickDurationMs}ms` : "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={engine.totalRestarts > 0 ? "text-amber-400" : "text-gray-500"}>{engine.totalRestarts}</span>
                        {engine.consecutiveFailures > 0 && <span className="ml-1 text-red-400 text-[10px]">({engine.consecutiveFailures} fails)</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={engine.correctionsApplied > 0 ? "text-sky-400" : "text-gray-500"}>
                          {engine.correctionsApplied}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={engine.priorityLevel === "critical" ? "text-red-400" : engine.priorityLevel === "high" ? "text-amber-400" : "text-gray-400"}>
                          {engine.priorityLevel}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className="text-gray-400">{engine.frequencyLevel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {recentIncidents.length > 0 && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <AlertTriangle className="w-4 h-4 inline mr-1" /> Incident History (last 100)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {[...recentIncidents].reverse().map(incident => (
                <div key={incident.id} className="flex items-start gap-2 text-xs py-1 border-b border-white/5">
                  <span className={`shrink-0 font-medium capitalize ${incidentColor(incident.type)}`}>[{incident.type}]</span>
                  <span className="text-gray-300 truncate">{incident.engineId}</span>
                  <span className="text-gray-500 shrink-0">{timeAgoMs(now - incident.timestamp)}</span>
                  <span className="text-gray-600 truncate">{incident.detail}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {optimizer.recentActions && optimizer.recentActions.length > 0 && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <TrendingDown className="w-4 h-4 inline mr-1" /> Recent Optimizer Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {optimizer.recentActions.slice().reverse().map((action: { action: string; engineId: string; previousValue?: string; newValue?: string; reason: string; timestamp: number }, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                  <span className="text-amber-400 shrink-0 capitalize">{action.action?.replace(/_/g, " ")}</span>
                  <span className="text-gray-300 truncate">{action.engineId}</span>
                  {action.previousValue && action.newValue && (
                    <span className="text-gray-500 shrink-0">{action.previousValue} → {action.newValue}</span>
                  )}
                  <span className="text-gray-600 truncate flex-1">{action.reason}</span>
                  <span className="text-gray-600 shrink-0">{timeAgoMs(now - action.timestamp)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GovernancePanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterEngine, setFilterEngine] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const summary = useMemo(() => getGovernanceSummary(), [refreshKey]);
  const pageStats = useMemo(() => getPageOpenStats(), [refreshKey]);
  const actionStats = useMemo(() => getActionStats(), [refreshKey]);
  const runtimeStats = useMemo(() => getRuntimeStats(), [refreshKey]);
  const flowStats = useMemo(() => getFlowClosureStats(), [refreshKey]);
  const remediationStats = useMemo(() => getRemediationStats(), [refreshKey]);
  const dedupCacheSize = useMemo(() => getDedupCacheSize(), [refreshKey]);
  const memoryViolations = useMemo(() => getAllGovernanceViolations().slice(-50).reverse(), [refreshKey]);

  const { data: dbViolations = [] } = useQuery({
    queryKey: ["governance-violations-db", refreshKey],
    queryFn: () => fetchViolations({ limit: 100 }),
    staleTime: 10_000,
  });

  const allViolations = useMemo(() => {
    const seen = new Set(memoryViolations.map((v) => v.id));
    const merged = [...memoryViolations];
    for (const v of dbViolations) {
      if (!seen.has(v.id)) {
        merged.push(v);
        seen.add(v.id);
      }
    }
    return merged.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }, [memoryViolations, dbViolations]);

  const filteredViolations = useMemo(() => {
    return allViolations.filter((v) => {
      if (filterSeverity !== "all" && v.severity !== filterSeverity) return false;
      if (filterEngine !== "all" && v.engine !== filterEngine) return false;
      if (filterStatus !== "all") {
        const vs = v.status ?? "new";
        if (vs !== filterStatus) return false;
      }
      if (searchText && !v.message.toLowerCase().includes(searchText.toLowerCase()) && !v.type.includes(searchText.toLowerCase())) return false;
      return true;
    }).slice(0, 100);
  }, [allViolations, filterSeverity, filterEngine, filterStatus, searchText]);

  const engineBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; critical: number; error: number; warning: number; info: number }> = {};
    for (const v of allViolations) {
      const eng = v.engine ?? "unknown";
      if (!counts[eng]) counts[eng] = { total: 0, critical: 0, error: 0, warning: 0, info: 0 };
      counts[eng].total++;
      counts[eng][v.severity]++;
    }
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total);
  }, [allViolations]);

  const uniqueEngines = useMemo(() => {
    const engines = new Set<string>();
    for (const v of allViolations) {
      if (v.engine) engines.add(v.engine);
    }
    return Array.from(engines).sort();
  }, [allViolations]);

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = useCallback(async (id: string) => {
    const ok = await acknowledgeViolation(id);
    if (ok) {
      toast.success("Violation acknowledged");
      setRefreshKey((k) => k + 1);
    }
  }, []);

  const handleResolve = useCallback(async (id: string) => {
    const ok = await resolveViolation(id);
    if (ok) {
      toast.success("Violation resolved");
      setRefreshKey((k) => k + 1);
    }
  }, []);

  const govEngines = [
    { name: "Vertical Isolation", id: "vertical-isolation" },
    { name: "Taxonomy Governance", id: "taxonomy-governance" },
    { name: "Media Relevance", id: "media-relevance" },
    { name: "Text Integrity", id: "text-integrity" },
    { name: "Layout Integrity", id: "layout-integrity" },
    { name: "Page Open Reliability", id: "page-open-reliability" },
    { name: "Action Wiring", id: "action-wiring" },
    { name: "Runtime Health", id: "runtime-health" },
    { name: "Flow Closure", id: "flow-closure" },
    { name: "Banner Strategy", id: "banner-strategy" },
    { name: "Localization", id: "localization-governance" },
    { name: "Auto-Remediation", id: "auto-remediation" },
    { name: "Anti-Conflict", id: "anti-conflict" },
  ];

  const severityBadge = (sev: string) => {
    const cls = sev === "critical" ? "bg-red-500/20 text-red-400" :
      sev === "error" ? "bg-orange-500/20 text-orange-400" :
      sev === "warning" ? "bg-amber-500/20 text-amber-400" :
      "bg-blue-500/20 text-blue-400";
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{sev}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Violations", value: summary.totalViolations, color: "text-amber-400" },
          { label: "Unresolved", value: summary.unresolvedCount, color: summary.unresolvedCount > 0 ? "text-red-400" : "text-emerald-400" },
          { label: "Auto-Remediated", value: summary.autoRemediatedCount, color: "text-blue-400" },
          { label: "Arch Debt", value: summary.architectureDebt, color: summary.architectureDebt > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "Dedup Cache", value: dedupCacheSize, color: "text-purple-400" },
        ].map((s) => (
          <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Eye className="w-4 h-4 inline mr-1" /> Page Open
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Total tracked</span><span className="text-white font-bold">{pageStats.total}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Successful</span><span className="text-emerald-400 font-bold">{pageStats.successful}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Failed</span><span className="text-red-400 font-bold">{pageStats.failed}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Avg duration</span><span className="text-blue-400 font-bold">{Math.round(pageStats.avgDuration)}ms</span></div>
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Activity className="w-4 h-4 inline mr-1" /> Action Wiring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Registered</span><span className="text-white font-bold">{actionStats.totalRegistered}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total clicks</span><span className="text-blue-400 font-bold">{actionStats.totalClicks}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Dead clicks</span><span className="text-red-400 font-bold">{actionStats.deadClicks}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Dead rate</span><span className={`font-bold ${actionStats.deadClickRate > 0.05 ? "text-red-400" : "text-emerald-400"}`}>{(actionStats.deadClickRate * 100).toFixed(1)}%</span></div>
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Heart className="w-4 h-4 inline mr-1" /> Runtime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Active subs</span><span className="text-emerald-400 font-bold">{runtimeStats.activeSubscriptions}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Stale subs</span><span className="text-amber-400 font-bold">{runtimeStats.staleSubscriptions}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Error subs</span><span className="text-red-400 font-bold">{runtimeStats.errorSubscriptions}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Fatal events</span><span className={`font-bold ${runtimeStats.fatalEvents > 0 ? "text-red-400" : "text-emerald-400"}`}>{runtimeStats.fatalEvents}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <ArrowRight className="w-4 h-4 inline mr-1" /> Flow Closure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Total flows</span><span className="text-white font-bold">{flowStats.totalFlows}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Active</span><span className="text-blue-400 font-bold">{flowStats.activeFlows}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Failed</span><span className="text-red-400 font-bold">{flowStats.failedFlows}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Blocked</span><span className="text-amber-400 font-bold">{flowStats.blockedFlows}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Closure rate</span><span className={`font-bold ${flowStats.closureRate < 0.9 ? "text-amber-400" : "text-emerald-400"}`}>{(flowStats.closureRate * 100).toFixed(0)}%</span></div>
          </CardContent>
        </Card>

        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Wrench className="w-4 h-4 inline mr-1" /> Auto-Remediation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Total remediations</span><span className="text-white font-bold">{remediationStats.total}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Auto-fix rate</span><span className={`font-bold ${remediationStats.autoRemediationRate > 0.5 ? "text-emerald-400" : "text-amber-400"}`}>{(remediationStats.autoRemediationRate * 100).toFixed(0)}%</span></div>
            {Object.entries(remediationStats.byAction).slice(0, 4).map(([action, count]) => (
              <div key={action} className="flex justify-between">
                <span className="text-gray-400 text-xs">{action.replace(/_/g, " ")}</span>
                <span className="text-blue-400 font-bold text-xs">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {engineBreakdown.length > 0 && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Cpu className="w-4 h-4 inline mr-1" /> Violations by Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {engineBreakdown.map(([engine, counts]) => (
                <div key={engine} className="flex items-center gap-3 p-2 rounded border border-white/5" style={{ backgroundColor: "hsl(220 40% 12%)" }}>
                  <span className="text-xs text-gray-300 w-40 truncate">{engine.replace(/-/g, " ")}</span>
                  <div className="flex-1 flex gap-2">
                    {counts.critical > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{counts.critical} crit</span>}
                    {counts.error > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">{counts.error} err</span>}
                    {counts.warning > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{counts.warning} warn</span>}
                    {counts.info > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{counts.info} info</span>}
                  </div>
                  <span className="text-white font-bold text-sm">{counts.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
            <Layers className="w-4 h-4 inline mr-1" /> Governance Engines (13)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {govEngines.map((eng) => {
              const engViolCount = allViolations.filter((v) => v.engine === eng.id).length;
              return (
                <div
                  key={eng.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-white/5 cursor-pointer hover:border-white/20 transition-colors"
                  style={{ backgroundColor: "hsl(220 40% 12%)" }}
                  onClick={() => { setFilterEngine(filterEngine === eng.id ? "all" : eng.id); setShowFilters(true); }}
                >
                  <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${engViolCount > 0 ? "text-amber-400" : "text-emerald-400"}`} />
                  <span className="text-xs text-gray-300 truncate flex-1">{eng.name}</span>
                  {engViolCount > 0 && <span className="text-[10px] text-amber-400 font-bold">{engViolCount}</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <AlertTriangle className="w-4 h-4 inline mr-1" /> Violations ({filteredViolations.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              {showFilters ? "Hide Filters" : "Filters"}
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <div className="px-6 pb-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white w-36 focus:outline-none focus:border-white/30"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-xs rounded px-2 py-1 border border-white/10 text-white focus:outline-none"
              style={{ backgroundColor: "hsl(220 40% 12%)" }}
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              value={filterEngine}
              onChange={(e) => setFilterEngine(e.target.value)}
              className="text-xs rounded px-2 py-1 border border-white/10 text-white focus:outline-none"
              style={{ backgroundColor: "hsl(220 40% 12%)" }}
            >
              <option value="all">All Engines</option>
              {uniqueEngines.map((e) => <option key={e} value={e}>{e.replace(/-/g, " ")}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs rounded px-2 py-1 border border-white/10 text-white focus:outline-none"
              style={{ backgroundColor: "hsl(220 40% 12%)" }}
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
            {(filterSeverity !== "all" || filterEngine !== "all" || filterStatus !== "all" || searchText) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400"
                onClick={() => { setFilterSeverity("all"); setFilterEngine("all"); setFilterStatus("all"); setSearchText(""); }}
              >
                Clear
              </Button>
            )}
          </div>
        )}

        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredViolations.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No violations match filters</p>
            )}
            {filteredViolations.map((v) => (
              <div key={v.id}>
                <div
                  className="flex items-start gap-2 p-2 rounded border border-white/5 text-xs cursor-pointer hover:border-white/20 transition-colors"
                  style={{ backgroundColor: "hsl(220 40% 12%)" }}
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                >
                  {severityBadge(v.severity)}
                  <span className="text-gray-300 flex-1 line-clamp-1">{v.message}</span>
                  {v.engine && <span className="text-purple-400 text-[10px] whitespace-nowrap">{v.engine}</span>}
                  {v.code && <span className="text-cyan-400 text-[10px] whitespace-nowrap">{v.code}</span>}
                  <span className="text-gray-500 text-[10px] whitespace-nowrap">{v.type.replace(/_/g, " ")}</span>
                  {expandedId === v.id ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                </div>
                {expandedId === v.id && (
                  <div className="ml-4 mt-1 p-3 rounded border border-white/5 text-xs space-y-2" style={{ backgroundColor: "hsl(220 40% 10%)" }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-gray-500">ID:</span> <span className="text-gray-300 break-all">{v.id}</span></div>
                      <div><span className="text-gray-500">Type:</span> <span className="text-gray-300">{v.type}</span></div>
                      <div><span className="text-gray-500">Source:</span> <span className="text-gray-300">{v.source}</span></div>
                      <div><span className="text-gray-500">Target:</span> <span className="text-gray-300">{v.target}</span></div>
                      <div><span className="text-gray-500">Owner:</span> <span className="text-gray-300">{v.ownerDomain}</span></div>
                      <div><span className="text-gray-500">Vertical:</span> <span className="text-gray-300">{v.vertical}</span></div>
                      {v.engine && <div><span className="text-gray-500">Engine:</span> <span className="text-purple-400">{v.engine}</span></div>}
                      {v.code && <div><span className="text-gray-500">Code:</span> <span className="text-cyan-400">{v.code}</span></div>}
                      {v.route && <div><span className="text-gray-500">Route:</span> <span className="text-gray-300">{v.route}</span></div>}
                      {v.dedupKey && <div><span className="text-gray-500">Dedup:</span> <span className="text-gray-400 break-all">{v.dedupKey}</span></div>}
                      {v.correlationId && <div><span className="text-gray-500">Correlation:</span> <span className="text-gray-300">{v.correlationId}</span></div>}
                      {v.entityType && <div><span className="text-gray-500">Entity:</span> <span className="text-gray-300">{v.entityType}:{v.entityId}</span></div>}
                      <div><span className="text-gray-500">Status:</span> <span className={`font-medium ${(v.status ?? "new") === "resolved" ? "text-emerald-400" : (v.status ?? "new") === "acknowledged" ? "text-blue-400" : "text-amber-400"}`}>{v.status ?? "new"}</span></div>
                      <div><span className="text-gray-500">Detected:</span> <span className="text-gray-300">{new Date(v.detectedAt).toLocaleString()}</span></div>
                      {v.resolvedAt && <div><span className="text-gray-500">Resolved:</span> <span className="text-emerald-400">{new Date(v.resolvedAt).toLocaleString()}</span></div>}
                      <div><span className="text-gray-500">Auto-fix:</span> <span className={v.autoRemediated ? "text-emerald-400" : "text-gray-500"}>{v.autoRemediated ? "Yes" : "No"}</span></div>
                    </div>
                    {Object.keys(v.metadata).length > 0 && (
                      <div>
                        <span className="text-gray-500">Metadata:</span>
                        <pre className="mt-1 text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(v.metadata, null, 2)}</pre>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {(v.status ?? "new") === "new" && (
                        <Button size="sm" variant="outline" className="text-[10px] h-6 border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => handleAcknowledge(v.id)}>
                          Acknowledge
                        </Button>
                      )}
                      {(v.status ?? "new") !== "resolved" && (
                        <Button size="sm" variant="outline" className="text-[10px] h-6 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleResolve(v.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {Object.keys(summary.byType).length > 0 && (
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              Violations by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(summary.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between p-2 rounded border border-white/5" style={{ backgroundColor: "hsl(220 40% 12%)" }}>
                  <span className="text-gray-400 text-xs">{type.replace(/_/g, " ")}</span>
                  <span className="text-white font-bold text-xs">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MemoryStats {
  totalFixes: number;
  autoApplyCount: number;
  disabledCount: number;
  totalApplied: number;
  totalRecurrences: number;
  recentApplied24h: number;
  avgScore: number;
  byType: Record<string, number>;
  byDomain: Record<string, number>;
  supabaseAvailable: boolean;
}

interface MemoryLearningReport {
  lastRun: number;
  runCount: number;
  totalFixes: number;
  consolidatedGroups: number;
  highPerformers: number;
  lowPerformers: number;
  disabledFixes: number;
}

interface MemoryFixRecord {
  id: string;
  type: string;
  issue_signature: string;
  root_cause: string | null;
  fix_applied: string | null;
  fix_function: string | null;
  confidence: number;
  auto_apply: boolean;
  created_at: string;
  updated_at: string;
  applied_count: number;
  last_applied_at: string | null;
  domain: string | null;
  category: string | null;
  engine_id: string | null;
  rule_id: string | null;
  success_count: number;
  failure_count: number;
  avg_fix_duration_ms: number;
  recurrence_after_fix: number;
  score: number;
  disabled: boolean;
}

function EngineMemoryPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [memStats, setMemStats] = useState<MemoryStats | null>(null);
  const [learningReport, setLearningReport] = useState<MemoryLearningReport | null>(null);
  const [topFixes, setTopFixes] = useState<MemoryFixRecord[]>([]);
  const [allFixes, setAllFixes] = useState<MemoryFixRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { engineMemory } = await import("@/engines/core/engine-memory");
        const { getLearningReport } = await import("@/engines/core/engine-learning");
        if (cancelled) return;
        setMemStats(engineMemory.getStats());
        setLearningReport(getLearningReport());
        setTopFixes(engineMemory.getTopFixes(10));
        setAllFixes(engineMemory.getAllFixes());
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 15_000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = useCallback(async (sig: string, enabled: boolean) => {
    try {
      const { engineMemory } = await import("@/engines/core/engine-memory");
      await engineMemory.toggleFix(sig, enabled);
      toast.success(enabled ? "Fix enabled" : "Fix disabled");
      setRefreshKey(k => k + 1);
    } catch {}
  }, []);

  const getScoreBreakdown = useCallback((record: MemoryFixRecord) => {
    const totalAttempts = record.success_count + record.failure_count;
    const successRate = totalAttempts > 0 ? record.success_count / totalAttempts : 0.5;
    const speedScore = record.avg_fix_duration_ms > 0 ? Math.max(0, 1 - (record.avg_fix_duration_ms / 10000)) : 0.5;
    const recurrenceScore = record.applied_count > 0 ? Math.max(0, 1 - (record.recurrence_after_fix / Math.max(1, record.applied_count))) : 0.5;
    return { successRate, speedScore, recurrenceScore };
  }, []);

  const recurrentBugs = useMemo(() =>
    allFixes.filter(f => f.recurrence_after_fix > 0).sort((a, b) => b.recurrence_after_fix - a.recurrence_after_fix),
    [allFixes],
  );

  const scoreColor = (score: number) =>
    score >= 0.8 ? "text-emerald-400" : score >= 0.5 ? "text-amber-400" : "text-red-400";

  const pctBar = (value: number) => (
    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${value >= 0.8 ? "bg-emerald-400" : value >= 0.5 ? "bg-amber-400" : "bg-red-400"}`}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );

  if (!memStats) {
    return <p className="text-gray-500 text-sm">Loading Engine Memory...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Fixes Learned", value: memStats.totalFixes, color: "text-blue-400" },
          { label: "Auto-Applied (24h)", value: memStats.recentApplied24h, color: "text-emerald-400" },
          { label: "Recurring Bugs", value: recurrentBugs.length, color: recurrentBugs.length === 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Avg Score", value: memStats.avgScore.toFixed(2), color: scoreColor(memStats.avgScore) },
        ].map(s => (
          <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
              <Brain className="w-4 h-4 inline mr-1" /> Memory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Total fixes</span><span className="text-white font-bold">{memStats.totalFixes}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Auto-apply active</span><span className="text-emerald-400 font-bold">{memStats.autoApplyCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Disabled fixes</span><span className="text-red-400 font-bold">{memStats.disabledCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total applications</span><span className="text-blue-400 font-bold">{memStats.totalApplied}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total recurrences</span><span className={`font-bold ${memStats.totalRecurrences === 0 ? "text-emerald-400" : "text-red-400"}`}>{memStats.totalRecurrences}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Supabase</span><span className={memStats.supabaseAvailable ? "text-emerald-400" : "text-amber-400"}>{memStats.supabaseAvailable ? "Connected" : "Offline (local cache)"}</span></div>
          </CardContent>
        </Card>

        {learningReport && (
          <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>
                <Activity className="w-4 h-4 inline mr-1" /> Learning Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Learning cycles</span><span className="text-white font-bold">{learningReport.runCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">High performers (&gt;0.8)</span><span className="text-emerald-400 font-bold">{learningReport.highPerformers}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Low performers (&lt;0.4)</span><span className="text-red-400 font-bold">{learningReport.lowPerformers}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Similar groups</span><span className="text-blue-400 font-bold">{learningReport.consolidatedGroups}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Auto-disabled</span><span className="text-amber-400 font-bold">{learningReport.disabledFixes}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Last run</span><span className="text-gray-300">{learningReport.lastRun ? timeAgo(new Date(learningReport.lastRun).toISOString()) : "never"}</span></div>
            </CardContent>
          </Card>
        )}
      </div>

      {recurrentBugs.length > 0 && (
        <Card className="border-red-500/20" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 inline mr-1" /> Recurring Bugs (target: 0)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recurrentBugs.slice(0, 10).map(f => {
              const bd = getScoreBreakdown(f);
              return (
                <div key={f.issue_signature} className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <div className="min-w-0">
                    <span className="text-white font-mono text-[10px]">{f.issue_signature}</span>
                    <div className="text-gray-500 mt-0.5">{f.domain} / {f.category} — {f.recurrence_after_fix} recurrences</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold ${scoreColor(f.score)}`}>{f.score.toFixed(2)}</span>
                    {pctBar(bd.recurrenceScore)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {recurrentBugs.length === 0 && memStats.totalFixes > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle size={14} />
          <span>Zero recurring bugs — all known fixes are holding.</span>
        </div>
      )}

      <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>Top 10 Fixes (by Score)</CardTitle>
          <p className="text-[10px] text-gray-500 mt-1">Score = 50% success rate + 20% speed + 30% recurrence eliminated</p>
        </CardHeader>
        <CardContent>
          {topFixes.length === 0 ? (
            <p className="text-xs text-gray-500">No fixes learned yet. The system will learn from accepted pipeline repairs.</p>
          ) : (
            <div className="space-y-2">
              {topFixes.map((f, idx) => {
                const bd = getScoreBreakdown(f);
                return (
                  <div key={f.issue_signature} className="p-2 rounded border border-white/5" style={{ backgroundColor: "hsl(220 40% 18%)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-500 text-xs w-5">#{idx + 1}</span>
                        <span className="text-white font-mono text-[10px] truncate max-w-[250px]">{f.issue_signature}</span>
                        {f.auto_apply && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">auto</span>}
                        {f.disabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">disabled</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-bold ${scoreColor(f.score)}`}>{f.score.toFixed(3)}</span>
                        <button
                          onClick={() => handleToggle(f.issue_signature, f.disabled || !f.auto_apply)}
                          className={`px-2 py-0.5 rounded text-[10px] border ${
                            f.auto_apply && !f.disabled
                              ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              : "border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                          }`}
                        >
                          {f.auto_apply && !f.disabled ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[10px] text-gray-500">
                      <div className="flex items-center gap-1">
                        <span>Success</span>
                        <span className={scoreColor(bd.successRate)}>{(bd.successRate * 100).toFixed(0)}%</span>
                        {pctBar(bd.successRate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Speed</span>
                        <span className={scoreColor(bd.speedScore)}>{(bd.speedScore * 100).toFixed(0)}%</span>
                        {pctBar(bd.speedScore)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>No Recurrence</span>
                        <span className={scoreColor(bd.recurrenceScore)}>{(bd.recurrenceScore * 100).toFixed(0)}%</span>
                        {pctBar(bd.recurrenceScore)}
                      </div>
                      <span className="text-gray-600">|</span>
                      <span>{f.applied_count}x applied</span>
                      <span>{f.domain}</span>
                      <span>{Math.round(f.avg_fix_duration_ms)}ms avg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {Object.keys(memStats.byDomain).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>Fixes by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(memStats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-gray-400 capitalize">{type}</span>
                  <span className="text-white font-bold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10" style={{ backgroundColor: "hsl(220 40% 14%)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "hsl(38 65% 56%)" }}>Fixes by Domain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(memStats.byDomain).sort((a, b) => b[1] - a[1]).map(([domain, count]) => (
                <div key={domain} className="flex justify-between text-xs">
                  <span className="text-gray-400">{domain}</span>
                  <span className="text-white font-bold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
