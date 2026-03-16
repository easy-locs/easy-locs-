/**
 * DeliveryKPIDashboard — QQQ. Delivery KPI Dashboard
 * Real-time KPIs: success rate, avg delays, incidents, trends.
 * PASS94-QQQ
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Package, Target } from "lucide-react";

interface KPIData {
  label: string;
  value: string;
  trend: number; // percentage change
  color: string;
  target?: string;
}

interface DailyMetric {
  date: string;
  deliveries: number;
  onTime: number;
  late: number;
  failed: number;
  avgDeliveryTime: number;
}

const MOCK_DAILY: DailyMetric[] = [
  { date: "11/03", deliveries: 42, onTime: 38, late: 3, failed: 1, avgDeliveryTime: 28 },
  { date: "12/03", deliveries: 51, onTime: 47, late: 3, failed: 1, avgDeliveryTime: 25 },
  { date: "13/03", deliveries: 38, onTime: 35, late: 2, failed: 1, avgDeliveryTime: 30 },
  { date: "14/03", deliveries: 55, onTime: 52, late: 2, failed: 1, avgDeliveryTime: 24 },
  { date: "15/03", deliveries: 48, onTime: 45, late: 2, failed: 1, avgDeliveryTime: 26 },
  { date: "16/03", deliveries: 33, onTime: 31, late: 1, failed: 1, avgDeliveryTime: 22 },
];

interface Incident {
  id: string;
  type: "delay" | "damage" | "lost" | "wrong_address";
  description: string;
  date: string;
  status: "open" | "resolved";
}

const MOCK_INCIDENTS: Incident[] = [
  { id: "i1", type: "delay", description: "Retard 45min — embouteillage Bd Périphérique", date: "2026-03-16", status: "resolved" },
  { id: "i2", type: "damage", description: "Colis endommagé — emballage insuffisant", date: "2026-03-15", status: "open" },
  { id: "i3", type: "wrong_address", description: "Adresse erronée — client absent", date: "2026-03-14", status: "resolved" },
  { id: "i4", type: "delay", description: "Retard 20min — panne véhicule", date: "2026-03-13", status: "resolved" },
];

export default function DeliveryKPIDashboard({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"kpis" | "daily" | "incidents">("kpis");
  const [period, setPeriod] = useState<"week" | "month">("week");

  const totals = useMemo(() => {
    const t = MOCK_DAILY.reduce((acc, d) => ({
      deliveries: acc.deliveries + d.deliveries,
      onTime: acc.onTime + d.onTime,
      late: acc.late + d.late,
      failed: acc.failed + d.failed,
      avgTime: acc.avgTime + d.avgDeliveryTime,
    }), { deliveries: 0, onTime: 0, late: 0, failed: 0, avgTime: 0 });
    return {
      ...t,
      avgTime: Math.round(t.avgTime / MOCK_DAILY.length),
      successRate: Math.round((t.onTime / t.deliveries) * 100),
      failRate: Math.round((t.failed / t.deliveries) * 100),
    };
  }, []);

  const kpis: KPIData[] = [
    { label: "Taux de succès", value: `${totals.successRate}%`, trend: 3.2, color: "hsl(var(--success))", target: "95%" },
    { label: "Délai moyen", value: `${totals.avgTime} min`, trend: -8.5, color: "hsl(var(--info))", target: "< 30 min" },
    { label: "Livraisons/jour", value: `${Math.round(totals.deliveries / MOCK_DAILY.length)}`, trend: 12, color: "hsl(var(--hud-cyan))", target: "50" },
    { label: "Incidents", value: `${MOCK_INCIDENTS.filter(i => i.status === "open").length}`, trend: -25, color: "hsl(var(--warning))", target: "0" },
  ];

  const incidentType: Record<string, { label: string; emoji: string; color: string }> = {
    delay: { label: "Retard", emoji: "⏰", color: "hsl(var(--warning))" },
    damage: { label: "Dommage", emoji: "💥", color: "hsl(var(--destructive))" },
    lost: { label: "Perdu", emoji: "❓", color: "hsl(var(--destructive))" },
    wrong_address: { label: "Adresse", emoji: "📍", color: "hsl(var(--info))" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>KPIs Livraison</h3>
        <div className="ml-auto flex gap-1">
          {(["week", "month"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="text-[8px] font-semibold px-2 py-0.5 rounded-full transition-all"
              style={{
                background: period === p ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
                color: period === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>
              {p === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-2">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${k.color}15` }}>
            <p className="text-[8px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{k.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-lg font-black" style={{ color: k.color }}>{k.value}</p>
              <div className="flex items-center gap-0.5 mb-1">
                {k.trend > 0 ? <TrendingUp className="h-2.5 w-2.5" style={{ color: "hsl(var(--success))" }} /> : <TrendingDown className="h-2.5 w-2.5" style={{ color: "hsl(var(--success))" }} />}
                <span className="text-[8px] font-bold" style={{ color: "hsl(var(--success))" }}>{Math.abs(k.trend)}%</span>
              </div>
            </div>
            {k.target && (
              <p className="text-[7px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>🎯 Objectif: {k.target}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "kpis" as const, label: "📊 Détails" },
          { id: "daily" as const, label: "📅 Journalier" },
          { id: "incidents" as const, label: `⚠️ Incidents (${MOCK_INCIDENTS.filter(i => i.status === "open").length})` },
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
        {tab === "kpis" && (
          <motion.div key="kpis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Répartition livraisons</p>
              {[
                { label: "À l'heure", value: totals.onTime, total: totals.deliveries, color: "hsl(var(--success))" },
                { label: "En retard", value: totals.late, total: totals.deliveries, color: "hsl(var(--warning))" },
                { label: "Échouées", value: totals.failed, total: totals.deliveries, color: "hsl(var(--destructive))" },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{s.label}</span>
                    <span className="font-bold" style={{ color: s.color }}>{s.value} ({Math.round(s.value / s.total * 100)}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.value / s.total) * 100}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "daily" && (
          <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
            {MOCK_DAILY.map(d => {
              const rate = Math.round((d.onTime / d.deliveries) * 100);
              return (
                <div key={d.date} className="rounded-lg px-3 py-2 flex items-center gap-3"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <span className="text-[10px] font-mono w-10" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{d.date}</span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                      <div className="h-full rounded-full" style={{ width: `${rate}%`, background: rate >= 90 ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold w-12 text-right" style={{ color: rate >= 90 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>{rate}%</span>
                  <span className="text-[8px] w-6 text-right" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{d.deliveries}</span>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "incidents" && (
          <motion.div key="incidents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_INCIDENTS.map(inc => {
              const cfg = incidentType[inc.type];
              return (
                <div key={inc.id} className="rounded-xl p-3 flex items-start gap-2"
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                  <span className="text-sm mt-0.5">{cfg.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{inc.date}</span>
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{inc.description}</p>
                  </div>
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      background: inc.status === "open" ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--success) / 0.1)",
                      color: inc.status === "open" ? "hsl(var(--destructive))" : "hsl(var(--success))",
                    }}>
                    {inc.status === "open" ? "Ouvert" : "Résolu"}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
