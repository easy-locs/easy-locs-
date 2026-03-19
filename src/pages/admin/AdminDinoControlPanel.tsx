/**
 * Admin DINO Control Panel — Live engine execution dashboard.
 * Run all DINO engines with real-time feedback.
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { runGrowthEngine } from "@/lib/dino/growthEngine";
import { runGlobalExpansion } from "@/lib/dino/globalEngine";
import { runPartnerEngine } from "@/lib/dino/partnerEngine";
import { runAICEO } from "@/lib/dino/ceoEngine";
import { runGodModeCycle } from "@/lib/dino/godMode";
import { runV20Debug, type DebugReport } from "@/lib/dino/v20Debug";
import { runV21AutoFix } from "@/lib/dino/v21AutoFix";
import {
  Zap, Globe, Handshake, Brain, Sparkles, Search, Wrench,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
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
  { key: "growth", label: "Growth Engine", icon: Zap, color: "hsl(38 80% 50%)", description: "V16 — User segmentation, campaigns, retargeting" },
  { key: "global", label: "Global Expansion", icon: Globe, color: "hsl(196 80% 50%)", description: "V17 — Market detection, driver activation, currency" },
  { key: "partner", label: "Partner Engine", icon: Handshake, color: "hsl(262 60% 58%)", description: "V18 — Pro rewards, category boosts, exclusivity" },
  { key: "ceo", label: "CEO Engine", icon: Brain, color: "hsl(340 65% 55%)", description: "V19 — Strategic decisions, budget control, orchestration" },
  { key: "godmode", label: "God Mode", icon: Sparkles, color: "hsl(145 60% 42%)", description: "V20 — Full user snapshot, identity + wallet + reputation" },
  { key: "debug", label: "V20 Debug", icon: Search, color: "hsl(210 70% 55%)", description: "Live system health inspector across all engines" },
  { key: "autofix", label: "V21 Auto-Fix", icon: Wrench, color: "hsl(16 85% 55%)", description: "Detect + patch missing profiles, wallet, reputation" },
];

export default function AdminDinoControlPanel() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, EngineStatus>>({});
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">DINO Control Panel</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Execute & monitor all engines</p>
          </div>
          <button
            onClick={runAll}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform"
          >
            Run All
          </button>
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

                {/* Result area */}
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
