/**
 * AIPredictivePlanning — BBB. AI Predictive Planning
 * Demand forecasting, driver pre-positioning, smart scheduling.
 * PASS90-BBB
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, TrendingUp, MapPin, Clock, Zap, BarChart3, Target, Users } from "lucide-react";

interface DemandForecast {
  hour: number;
  predicted: number;
  actual?: number;
  confidence: number;
}

interface HotZone {
  id: string;
  name: string;
  predictedDemand: "high" | "medium" | "low";
  currentDrivers: number;
  recommendedDrivers: number;
  surgeExpected: boolean;
  peakHour: string;
}

interface SchedulingSuggestion {
  id: string;
  type: "position" | "schedule" | "capacity" | "alert";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  emoji: string;
  actionable: boolean;
}

const MOCK_FORECAST: DemandForecast[] = Array.from({ length: 24 }, (_, h) => {
  const base = h >= 7 && h <= 9 ? 35 : h >= 11 && h <= 14 ? 45 : h >= 17 && h <= 20 ? 55 : h >= 22 || h <= 5 ? 8 : 20;
  return { hour: h, predicted: base + Math.floor(Math.random() * 10), actual: h <= 10 ? base + Math.floor(Math.random() * 12) : undefined, confidence: 75 + Math.floor(Math.random() * 20) };
});

const MOCK_ZONES: HotZone[] = [
  { id: "hz1", name: "Paris 1er-4e", predictedDemand: "high", currentDrivers: 8, recommendedDrivers: 14, surgeExpected: true, peakHour: "18:00-20:00" },
  { id: "hz2", name: "La Défense", predictedDemand: "high", currentDrivers: 5, recommendedDrivers: 10, surgeExpected: true, peakHour: "17:30-19:00" },
  { id: "hz3", name: "Montmartre", predictedDemand: "medium", currentDrivers: 4, recommendedDrivers: 6, surgeExpected: false, peakHour: "12:00-14:00" },
  { id: "hz4", name: "Bastille", predictedDemand: "medium", currentDrivers: 3, recommendedDrivers: 5, surgeExpected: false, peakHour: "19:00-21:00" },
  { id: "hz5", name: "Saint-Denis", predictedDemand: "low", currentDrivers: 2, recommendedDrivers: 3, surgeExpected: false, peakHour: "11:00-13:00" },
];

const MOCK_SUGGESTIONS: SchedulingSuggestion[] = [
  { id: "s1", type: "position", title: "Pré-positionner 6 chauffeurs Centre", description: "La demande prévue entre 17h-20h nécessite 6 chauffeurs supplémentaires dans Paris 1er-4e.", impact: "high", emoji: "📍", actionable: true },
  { id: "s2", type: "capacity", title: "Capacité insuffisante La Défense", description: "5 chauffeurs présents vs 10 recommandés. Risque de temps d'attente élevé.", impact: "high", emoji: "⚠️", actionable: true },
  { id: "s3", type: "schedule", title: "Planifier shift supplémentaire vendredi", description: "Tendance historique: +40% de demande le vendredi soir. Ajouter un shift 18h-23h.", impact: "medium", emoji: "📅", actionable: true },
  { id: "s4", type: "alert", title: "Événement détecté: Concert Accor Arena", description: "Forte affluence prévue le 18/03 à 21h. Préparer 15 chauffeurs zone Bercy.", impact: "high", emoji: "🎵", actionable: true },
  { id: "s5", type: "position", title: "Redistribution zone calme → active", description: "2 chauffeurs inactifs à Saint-Denis peuvent être redirigés vers Bastille.", impact: "low", emoji: "🔄", actionable: true },
];

const DEMAND_COLORS: Record<string, string> = {
  high: "hsl(var(--destructive))", medium: "hsl(var(--warning))", low: "hsl(var(--success))",
};

export default function AIPredictivePlanning({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"forecast" | "zones" | "suggestions">("forecast");

  const maxPredicted = useMemo(() => Math.max(...MOCK_FORECAST.map(f => f.predicted)), []);
  const currentHour = new Date().getHours();
  const todayDemand = MOCK_FORECAST.reduce((s, f) => s + f.predicted, 0);
  const accuracy = useMemo(() => {
    const withActual = MOCK_FORECAST.filter(f => f.actual !== undefined);
    if (!withActual.length) return 0;
    const avgDiff = withActual.reduce((s, f) => s + Math.abs(f.predicted - (f.actual || 0)) / f.predicted, 0) / withActual.length;
    return Math.round((1 - avgDiff) * 100);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Planification IA</h3>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
          🧠 Gemini
        </span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Demande prévue", value: todayDemand, emoji: "📊" },
          { label: "Précision IA", value: `${accuracy}%`, emoji: "🎯" },
          { label: "Suggestions", value: MOCK_SUGGESTIONS.length, emoji: "💡" },
        ].map(s => (
          <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm">{s.emoji}</p>
            <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "forecast" as const, label: "📈 Prévisions" },
          { id: "zones" as const, label: "🗺️ Zones" },
          { id: "suggestions" as const, label: "💡 Actions" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "forecast" && (
          <motion.div key="forecast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Hourly chart */}
            <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>Demande prévue (24h)</p>
              <div className="flex items-end gap-[2px] h-24">
                {MOCK_FORECAST.map(f => {
                  const h = (f.predicted / maxPredicted) * 100;
                  const isCurrent = f.hour === currentHour;
                  const isPast = f.hour < currentHour;
                  return (
                    <div key={f.hour} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                      {/* Actual bar (behind) */}
                      {f.actual !== undefined && (
                        <div className="absolute bottom-0 w-full rounded-t-sm" style={{ height: `${(f.actual / maxPredicted) * 100}%`, background: "hsl(var(--success) / 0.2)" }} />
                      )}
                      {/* Predicted bar */}
                      <motion.div className="w-full rounded-t-sm relative z-10"
                        initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.5, delay: f.hour * 0.02 }}
                        style={{
                          background: isCurrent ? "hsl(var(--hud-cyan))" : isPast ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-cyan) / 0.15)",
                          minHeight: "2px",
                        }}
                      />
                      {f.hour % 4 === 0 && (
                        <span className="text-[7px] mt-1 absolute -bottom-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{f.hour}h</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded-sm" style={{ background: "hsl(var(--hud-cyan) / 0.5)" }} />
                  <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Prévu</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded-sm" style={{ background: "hsl(var(--success) / 0.3)" }} />
                  <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Réel</span>
                </div>
              </div>
            </div>

            {/* Confidence */}
            <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>🎯 Confiance du modèle</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-full h-2" style={{ background: "hsl(var(--hud-bg))" }}>
                  <motion.div className="h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${accuracy}%` }}
                    transition={{ duration: 1 }} style={{ background: accuracy > 85 ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
                </div>
                <span className="text-[11px] font-bold" style={{ color: accuracy > 85 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>{accuracy}%</span>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "zones" && (
          <motion.div key="zones" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_ZONES.map(z => {
              const deficit = z.recommendedDrivers - z.currentDrivers;
              return (
                <div key={z.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${DEMAND_COLORS[z.predictedDemand]}15` }}>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4" style={{ color: DEMAND_COLORS[z.predictedDemand] }} />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{z.name}</p>
                      <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                        Pic: {z.peakHour} {z.surgeExpected && "• 🔥 Surge prévu"}
                      </p>
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{
                      background: `${DEMAND_COLORS[z.predictedDemand]}15`,
                      color: DEMAND_COLORS[z.predictedDemand],
                    }}>
                      {z.predictedDemand === "high" ? "🔴 Forte" : z.predictedDemand === "medium" ? "🟡 Modérée" : "🟢 Faible"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                      <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{z.currentDrivers}</p>
                      <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Présents</p>
                    </div>
                    <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                      <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{z.recommendedDrivers}</p>
                      <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Recommandés</p>
                    </div>
                    <div className="text-center py-1 rounded-lg" style={{ background: deficit > 0 ? "hsl(var(--destructive) / 0.06)" : "hsl(var(--success) / 0.06)" }}>
                      <p className="text-[10px] font-bold" style={{ color: deficit > 0 ? "hsl(var(--destructive))" : "hsl(var(--success))" }}>
                        {deficit > 0 ? `+${deficit}` : "✓"}
                      </p>
                      <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Besoin</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "suggestions" && (
          <motion.div key="suggestions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_SUGGESTIONS.map(s => {
              const impactCfg: Record<string, { color: string; label: string }> = {
                high: { color: "hsl(var(--destructive))", label: "Impact élevé" },
                medium: { color: "hsl(var(--warning))", label: "Impact moyen" },
                low: { color: "hsl(var(--info))", label: "Impact faible" },
              };
              const cfg = impactCfg[s.impact];
              return (
                <div key={s.id} className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{s.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.title}</p>
                        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${cfg.color}12`, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{s.description}</p>
                      {s.actionable && (
                        <button className="mt-2 text-[9px] font-semibold px-2 py-1 rounded-md" style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
                          ⚡ Appliquer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
