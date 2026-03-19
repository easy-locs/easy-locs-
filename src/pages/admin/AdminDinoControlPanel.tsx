/**
 * Admin DINO Control Panel — Live engine execution dashboard.
 * Run all DINO engines with real-time feedback.
 * Includes Auto-Fix + Recheck combined action and weighted health score.
 */
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { runGrowthEngine } from "@/lib/dino/growthEngine";
import { runGlobalExpansion } from "@/lib/dino/globalEngine";
import { runPartnerEngine } from "@/lib/dino/partnerEngine";
import { runAICEO } from "@/lib/dino/ceoEngine";
import { runGodModeCycle } from "@/lib/dino/godMode";
import { runV20Debug, type DebugReport, type DebugSection } from "@/lib/dino/v20Debug";
import { runV21AutoFix } from "@/lib/dino/v21AutoFix";
import { quickFixAndRecheck } from "@/lib/dino/v21AutoFix";
import {
  Zap, Globe, Handshake, Brain, Sparkles, Search, Wrench,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  ShieldCheck, RefreshCw,
} from "lucide-react";

type EngineStatus = "idle" | "running" | "success" | "error";

interface EngineEntry {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const ENGINES: EngineEntry[] = [
  { key: "growth", label: "Growth Engine", icon: Zap, color: "hsl(38 80% 50%)", description: "V16 — Segmentation, campaigns, retargeting" },
  { key: "global", label: "Global Expansion", icon: Globe, color: "hsl(196 80% 50%)", description: "V17 — Market detection, driver activation" },
  { key: "partner", label: "Partner Engine", icon: Handshake, color: "hsl(262 60% 58%)", description: "V18 — Pro rewards, category boosts" },
  { key: "ceo", label: "CEO Engine", icon: Brain, color: "hsl(340 65% 55%)", description: "V19 — Strategic decisions, orchestration" },
  { key: "godmode", label: "God Mode", icon: Sparkles, color: "hsl(145 60% 42%)", description: "V20 — Full snapshot, identity + wallet + rep" },
  { key: "debug", label: "V20 Debug", icon: Search, color: "hsl(210 70% 55%)", description: "Live health inspector across all engines" },
  { key: "autofix", label: "V21 Auto-Fix", icon: Wrench, color: "hsl(16 85% 55%)", description: "Detect + patch missing data" },
];

/** Weighted health score — critical sections have higher weight */
const SECTION_WEIGHTS: Record<string, number> = {
  identity: 20,
  reputation: 15,
  wallet: 20,
  recommendations: 10,
  journeys: 10,
  growth: 5,
  global: 5,
  partner: 5,
  ceo: 5,
  orders_delivery_escrow: 5,
};

function computeWeightedHealth(sections: DebugSection[]): number {
  if (sections.length === 0) return 0;
  let totalWeight = 0;
  let earned = 0;
  for (const s of sections) {
    const w = SECTION_WEIGHTS[s.key] ?? 5;
    totalWeight += w;
    if (s.ok) earned += w;
  }
  return totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;
}

export default function AdminDinoControlPanel() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useOrgRole();
  const [statuses, setStatuses] = useState<Record<string, EngineStatus>>({});
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [fixAndRecheckResult, setFixAndRecheckResult] = useState<unknown>(null);
  const [fixAndRecheckStatus, setFixAndRecheckStatus] = useState<EngineStatus>("idle");

  const isAdmin = role === "owner" || role === "admin";

  // Compute health from debug result if available
  const healthScore = useMemo(() => {
    const debugResult = results["debug"] as DebugReport | null;
    if (!debugResult?.sections) return null;
    return computeWeightedHealth(debugResult.sections);
  }, [results]);

  const setStatus = (key: string, status: EngineStatus) =>
    setStatuses(prev => ({ ...prev, [key]: status }));
  const setResult = (key: string, data: unknown) =>
    setResults(prev => ({ ...prev, [key]: data }));

  const runEngine = useCallback(async (key: string) => {
    if (!user?.id) return;
    setStatus(key, "running");
    setResult(key, null);

    try {
      let result: unknown;
      switch (key) {
        case "growth": result = await runGrowthEngine(); break;
        case "global": result = await runGlobalExpansion(); break;
        case "partner": result = await runPartnerEngine(); break;
        case "ceo": result = await runAICEO(); break;
        case "godmode": result = await runGodModeCycle(user.id); break;
        case "debug": result = await runV20Debug(user.id); break;
        case "autofix": result = await runV21AutoFix(user.id); break;
      }
      setResult(key, result);
      setStatus(key, "success");
    } catch (err) {
      setResult(key, { error: err instanceof Error ? err.message : String(err) });
      setStatus(key, "error");
    }
  }, [user?.id]);

  const toggleExpand = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const runAll = async () => {
    for (const engine of ENGINES) {
      await runEngine(engine.key);
    }
  };

  const runFixAndRecheck = async () => {
    if (!user?.id) return;
    setFixAndRecheckStatus("running");
    setFixAndRecheckResult(null);
    try {
      const result = await quickFixAndRecheck(user.id);
      setFixAndRecheckResult(result);
      setFixAndRecheckStatus("success");
    } catch (err) {
      setFixAndRecheckResult({ error: err instanceof Error ? err.message : String(err) });
      setFixAndRecheckStatus("error");
    }
  };

  // Admin access guard
  if (!user || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-sm font-bold text-foreground">Access Denied</p>
          <p className="text-xs text-muted-foreground">Admin or Owner role required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">DINO Control Panel</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Execute & monitor all engines</p>
          </div>
          <div className="flex items-center gap-2">
            {healthScore !== null && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold ${
                healthScore >= 80 ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                healthScore >= 50 ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" :
                "border-destructive/30 text-destructive bg-destructive/10"
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {healthScore}%
              </div>
            )}
            <button
              onClick={runAll}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform"
            >
              Run All
            </button>
          </div>
        </div>

        {/* Auto-Fix + Recheck Combined */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Auto-Fix + Recheck</p>
                <p className="text-[10px] text-muted-foreground">Run V21 fix → rerun V20 debug → compare</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {fixAndRecheckStatus === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {fixAndRecheckStatus === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {fixAndRecheckStatus === "error" && <XCircle className="w-4 h-4 text-destructive" />}
              <button
                onClick={runFixAndRecheck}
                disabled={fixAndRecheckStatus === "running"}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform"
              >
                {fixAndRecheckStatus === "running" ? "Running..." : "Execute"}
              </button>
            </div>
          </div>
          {fixAndRecheckResult && (
            <div className="mt-3 border-t border-border/10 pt-3">
              <FixRecheckSummary data={fixAndRecheckResult} />
            </div>
          )}
        </div>

        {/* Engine Cards */}
        <div className="space-y-3">
          {ENGINES.map(engine => {
            const status = statuses[engine.key] || "idle";
            const result = results[engine.key];
            const isExpanded = expanded[engine.key] ?? false;

            return (
              <div key={engine.key} className="rounded-2xl border border-border/20 bg-card/80 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${engine.color.replace(")", " / 0.12)")}` }}
                  >
                    <engine.icon className="w-5 h-5" style={{ color: engine.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{engine.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{engine.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                    {status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {status === "error" && <XCircle className="w-4 h-4 text-destructive" />}

                    <button
                      onClick={() => runEngine(engine.key)}
                      disabled={status === "running"}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform"
                    >
                      {status === "running" ? "..." : "Run"}
                    </button>
                  </div>
                </div>

                {result && (
                  <div className="border-t border-border/10 px-4 py-2">
                    <button
                      onClick={() => toggleExpand(engine.key)}
                      className="flex items-center gap-1 text-xs text-muted-foreground font-medium w-full"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {status === "success" ? "View results" : "View error"}
                    </button>
                    {isExpanded && (
                      <pre className="text-[10px] bg-muted text-muted-foreground rounded-lg p-3 mt-2 overflow-auto max-h-60">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Summary component for Auto-Fix + Recheck results */
function FixRecheckSummary({ data }: { data: unknown }) {
  const d = data as any;
  if (d?.error) {
    return <p className="text-xs text-destructive">{d.error}</p>;
  }

  const fp = d?.firstPass;
  const healthy = d?.healthy;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">Detected: <b className="text-foreground">{fp?.detected ?? 0}</b></span>
        <span className="text-muted-foreground">Patched: <b className="text-emerald-400">{fp?.patched ?? 0}</b></span>
        <span className="text-muted-foreground">Failed: <b className="text-destructive">{fp?.failed ?? 0}</b></span>
        <span className="text-muted-foreground">Skipped: <b className="text-foreground">{fp?.skipped ?? 0}</b></span>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-bold ${healthy ? "text-emerald-400" : "text-destructive"}`}>
        {healthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
        {healthy ? "System healthy after recheck" : "Issues remain after fix"}
      </div>
    </div>
  );
}
