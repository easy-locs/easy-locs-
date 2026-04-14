import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle, Brain } from "lucide-react";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

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

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86400_000)}d ago`;
}

export function EngineMemoryPanel() {
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

  useUiEngine("admin-enginememorypanel");

  return (
    <SubPageShell>
      <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Fixes Learned", value: memStats.totalFixes, color: "text-blue-400" },
          { label: "Auto-Applied (24h)", value: memStats.recentApplied24h, color: "text-emerald-400" },
          { label: "Recurring Bugs", value: recurrentBugs.length, color: recurrentBugs.length === 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Avg Score", value: memStats.avgScore.toFixed(2), color: scoreColor(memStats.avgScore) },
        ].map(s => (
          <Card key={s.label} className="border-white/10" style={{ backgroundColor: "hsl(225 22% 13%)" }}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-white/10" style={{ backgroundColor: "hsl(225 22% 13%)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: "hsl(var(--accent))" }}>
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
          <Card className="border-white/10" style={{ backgroundColor: "hsl(225 22% 13%)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "hsl(var(--accent))" }}>
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
        <Card className="border-red-500/20" style={{ backgroundColor: "hsl(225 22% 13%)" }}>
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

      <Card className="border-white/10" style={{ backgroundColor: "hsl(225 22% 13%)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: "hsl(var(--accent))" }}>Top 10 Fixes (by Score)</CardTitle>
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
                  <div key={f.issue_signature} className="p-2 rounded border border-white/5" style={{ backgroundColor: "hsl(225 22% 16%)" }}>
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
          <Card className="border-white/10" style={{ backgroundColor: "hsl(225 22% 13%)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "hsl(var(--accent))" }}>Fixes by Type</CardTitle>
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

          <Card className="border-white/10" style={{ backgroundColor: "hsl(225 22% 13%)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "hsl(var(--accent))" }}>Fixes by Domain</CardTitle>
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
    </SubPageShell>
  );
}
