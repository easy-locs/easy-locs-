/**
 * AIDispatchBrain — YYY. AI Dispatch Brain.
 * Predictive allocation, continuous learning, Monte Carlo simulation, A/B testing routing algorithms.
 * PASS103-YYY
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Cpu, BarChart3, Zap, Target,
  TrendingUp, RefreshCw, Activity, Layers, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface DispatchModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  avgLatency: number;
  successRate: number;
  status: "active" | "testing" | "deprecated";
  lastTrained: Date;
  trainingDataSize: number;
}

interface SimulationResult {
  id: string;
  scenario: string;
  iterations: number;
  avgDeliveryTime: number;
  costReduction: number;
  successRate: number;
  confidence: number;
  status: "running" | "completed" | "failed";
}

interface ABTest {
  id: string;
  name: string;
  modelA: string;
  modelB: string;
  traffic: number;
  startDate: Date;
  results: { aSuccess: number; bSuccess: number; aAvgTime: number; bAvgTime: number };
  status: "running" | "concluded" | "paused";
  winner: string | null;
}

const MODELS: DispatchModel[] = [
  { id: "m1", name: "NearestNeighbor v3", version: "3.2.1", accuracy: 87, avgLatency: 120, successRate: 91, status: "active", lastTrained: new Date(Date.now() - 86400000), trainingDataSize: 45000 },
  { id: "m2", name: "PredictiveGNN", version: "1.4.0", accuracy: 93, avgLatency: 340, successRate: 95, status: "active", lastTrained: new Date(Date.now() - 172800000), trainingDataSize: 120000 },
  { id: "m3", name: "ReinforcementQ-Agent", version: "2.0.0-beta", accuracy: 89, avgLatency: 280, successRate: 88, status: "testing", lastTrained: new Date(Date.now() - 43200000), trainingDataSize: 78000 },
  { id: "m4", name: "HeuristicLegacy", version: "1.0.0", accuracy: 72, avgLatency: 45, successRate: 82, status: "deprecated", lastTrained: new Date(Date.now() - 2592000000), trainingDataSize: 15000 },
];

const SIMULATIONS: SimulationResult[] = [
  { id: "sim1", scenario: "Peak hour Dakar Centre", iterations: 10000, avgDeliveryTime: 28, costReduction: 12, successRate: 94, confidence: 96, status: "completed" },
  { id: "sim2", scenario: "Weekend demand surge", iterations: 5000, avgDeliveryTime: 35, costReduction: 8, successRate: 91, confidence: 89, status: "completed" },
  { id: "sim3", scenario: "Multi-zone balancing", iterations: 8000, avgDeliveryTime: 22, costReduction: 18, successRate: 97, confidence: 0, status: "running" },
];

const AB_TESTS: ABTest[] = [
  { id: "ab1", name: "GNN vs NN routing", modelA: "NearestNeighbor v3", modelB: "PredictiveGNN", traffic: 50, startDate: new Date(Date.now() - 604800000), results: { aSuccess: 1245, bSuccess: 1389, aAvgTime: 32, bAvgTime: 27 }, status: "running", winner: null },
  { id: "ab2", name: "RL-Agent pilot", modelA: "PredictiveGNN", modelB: "ReinforcementQ-Agent", traffic: 20, startDate: new Date(Date.now() - 259200000), results: { aSuccess: 420, bSuccess: 398, aAvgTime: 29, bAvgTime: 31 }, status: "running", winner: null },
  { id: "ab3", name: "Legacy sunset test", modelA: "HeuristicLegacy", modelB: "NearestNeighbor v3", traffic: 100, startDate: new Date(Date.now() - 1209600000), results: { aSuccess: 2100, bSuccess: 2650, aAvgTime: 38, bAvgTime: 30 }, status: "concluded", winner: "NearestNeighbor v3" },
];

export default function AIDispatchBrain({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"models" | "simulations" | "ab_tests">("models");

  const activeModels = MODELS.filter(m => m.status === "active").length;
  const avgAccuracy = Math.round(MODELS.filter(m => m.status !== "deprecated").reduce((s, m) => s + m.accuracy, 0) / MODELS.filter(m => m.status !== "deprecated").length);
  const runningSims = SIMULATIONS.filter(s => s.status === "running").length;
  const runningTests = AB_TESTS.filter(t => t.status === "running").length;

  const statusCfg = (s: string) => ({
    active: { label: "Actif", color: "--success" },
    testing: { label: "Test", color: "--warning" },
    deprecated: { label: "Obsolète", color: "--muted-foreground" },
    running: { label: "En cours", color: "--info" },
    completed: { label: "Terminé", color: "--success" },
    failed: { label: "Échec", color: "--destructive" },
    concluded: { label: "Conclu", color: "--success" },
    paused: { label: "Pause", color: "--warning" },
  }[s] || { label: s, color: "--muted-foreground" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Brain className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        AI Dispatch Brain
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Modèles actifs", value: activeModels, color: "--success" },
          { label: "Précision moy.", value: `${avgAccuracy}%`, color: "--primary" },
          { label: "Simulations", value: runningSims, color: "--info" },
          { label: "A/B Tests", value: runningTests, color: "--warning" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["models", "simulations", "ab_tests"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "models" ? "🧠 Modèles" : v === "simulations" ? "🎲 Monte Carlo" : "🔬 A/B Tests"}
          </button>
        ))}
      </div>

      {view === "models" && (
        <div className="space-y-2">
          {MODELS.map(m => {
            const cfg = statusCfg(m.status);
            return (
              <div key={m.id} className="rounded-xl p-3"
                style={{ background: m.status === "deprecated" ? "hsl(var(--muted) / 0.1)" : "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 shrink-0" style={{ color: `hsl(var(${cfg.color}))` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{m.name}</p>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      v{m.version} • 🎯 {m.accuracy}% • ⚡ {m.avgLatency}ms • 📊 {(m.trainingDataSize / 1000).toFixed(0)}k samples
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: m.successRate >= 90 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                      {m.successRate}%
                    </p>
                    <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>succès</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${m.accuracy}%` }}
                    className="h-full rounded-full" style={{ background: m.accuracy >= 90 ? "hsl(var(--success))" : m.accuracy >= 80 ? "hsl(var(--primary))" : "hsl(var(--warning))" }} />
                </div>
              </div>
            );
          })}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Réentraînement lancé pour PredictiveGNN"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--primary))" }}>
            <RefreshCw className="h-3 w-3 mr-1" /> Relancer l'entraînement
          </Button>
        </div>
      )}

      {view === "simulations" && (
        <div className="space-y-2">
          {SIMULATIONS.map(s => {
            const cfg = statusCfg(s.status);
            return (
              <div key={s.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" style={{ color: `hsl(var(${cfg.color}))` }} />
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.scenario}</p>
                  </div>
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[
                    { label: "Itérations", value: `${(s.iterations / 1000).toFixed(0)}k` },
                    { label: "Temps moy.", value: `${s.avgDeliveryTime}min` },
                    { label: "Coût ↓", value: `${s.costReduction}%` },
                    { label: "Confiance", value: s.status === "running" ? "..." : `${s.confidence}%` },
                  ].map(d => (
                    <div key={d.label} className="text-center">
                      <p className="text-[9px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{d.value}</p>
                      <p className="text-[6px]" style={{ color: "hsl(var(--muted-foreground))" }}>{d.label}</p>
                    </div>
                  ))}
                </div>
                {s.status === "running" && (
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                    <motion.div animate={{ width: ["0%", "70%", "40%", "80%"] }} transition={{ duration: 3, repeat: Infinity }}
                      className="h-full rounded-full" style={{ background: "hsl(var(--info))" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "ab_tests" && (
        <div className="space-y-2">
          {AB_TESTS.map(t => {
            const cfg = statusCfg(t.status);
            const totalA = t.results.aSuccess;
            const totalB = t.results.bSuccess;
            const total = totalA + totalB;
            const aPct = total > 0 ? Math.round((totalA / total) * 100) : 50;
            return (
              <div key={t.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t.name}</p>
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>
                    {t.winner ? `🏆 ${t.winner}` : cfg.label}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "hsl(var(--primary) / 0.05)" }}>
                    <p className="text-[7px] font-bold" style={{ color: "hsl(var(--primary))" }}>A: {t.modelA}</p>
                    <p className="text-[10px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{totalA} ✓</p>
                    <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>~{t.results.aAvgTime}min</p>
                  </div>
                  <div className="flex items-center text-[8px] font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>VS</div>
                  <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "hsl(var(--info) / 0.05)" }}>
                    <p className="text-[7px] font-bold" style={{ color: "hsl(var(--info))" }}>B: {t.modelB}</p>
                    <p className="text-[10px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{totalB} ✓</p>
                    <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>~{t.results.bAvgTime}min</p>
                  </div>
                </div>
                <div className="flex h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <div className="h-full rounded-l-full" style={{ width: `${aPct}%`, background: "hsl(var(--primary))" }} />
                  <div className="h-full rounded-r-full" style={{ width: `${100 - aPct}%`, background: "hsl(var(--info))" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
