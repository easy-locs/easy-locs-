/**
 * GreenDeliveryDashboard — JJJ. Green Delivery Dashboard
 * Carbon footprint, EV tracking, CSR goals, environmental metrics.
 * PASS92-JJJ
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Leaf, Zap, Fuel, TrendingDown, Award, Target, Bike, Car, Truck } from "lucide-react";

interface GreenMetric {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
}

interface VehicleBreakdown {
  type: string;
  icon: string;
  count: number;
  co2PerKm: number;
  totalKm: number;
  isEV: boolean;
}

interface CSRGoal {
  id: string;
  label: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
}

const METRICS: GreenMetric[] = [
  { label: "CO₂ ce mois", value: "2.4t", change: "-18%", changeType: "positive", icon: "🌍" },
  { label: "Km verts", value: "68%", change: "+12%", changeType: "positive", icon: "🌱" },
  { label: "Énergie (kWh)", value: "1,240", change: "-5%", changeType: "positive", icon: "⚡" },
  { label: "Score RSE", value: "B+", change: "↑", changeType: "positive", icon: "🏆" },
];

const VEHICLES: VehicleBreakdown[] = [
  { type: "Vélos cargo", icon: "🚲", count: 8, co2PerKm: 0, totalKm: 2400, isEV: true },
  { type: "Scooters élec.", icon: "🛵", count: 5, co2PerKm: 0, totalKm: 1800, isEV: true },
  { type: "Voitures élec.", icon: "🔋", count: 3, co2PerKm: 0, totalKm: 3200, isEV: true },
  { type: "Voitures hybrid.", icon: "🚗", count: 4, co2PerKm: 65, totalKm: 4100, isEV: false },
  { type: "Utilitaires diesel", icon: "🚐", count: 2, co2PerKm: 180, totalKm: 2800, isEV: false },
];

const CSR_GOALS: CSRGoal[] = [
  { id: "g1", label: "Réduction CO₂ annuelle", target: 40, current: 28, unit: "%", deadline: "Déc 2026" },
  { id: "g2", label: "Flotte électrique", target: 80, current: 62, unit: "%", deadline: "Juin 2027" },
  { id: "g3", label: "Emballages recyclables", target: 100, current: 85, unit: "%", deadline: "Mars 2027" },
  { id: "g4", label: "Compensation carbone", target: 100, current: 45, unit: "%", deadline: "Déc 2026" },
];

export default function GreenDeliveryDashboard({ orgId }: { orgId: string }) {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const evPercent = useMemo(() => {
    const total = VEHICLES.reduce((s, v) => s + v.count, 0);
    const ev = VEHICLES.filter(v => v.isEV).reduce((s, v) => s + v.count, 0);
    return Math.round((ev / total) * 100);
  }, []);

  const totalCO2 = useMemo(() =>
    VEHICLES.reduce((s, v) => s + (v.co2PerKm * v.totalKm / 1000), 0).toFixed(1)
  , []);

  const hourlyChart = [35, 42, 28, 55, 48, 62, 45, 38, 52, 60, 43, 30];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Leaf className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Green Delivery</h3>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
          background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))",
        }}>🌱 Score B+</span>
      </div>

      {/* Period */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {(["week", "month", "year"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-semibold"
            style={{
              background: period === p ? "hsl(var(--success) / 0.12)" : "transparent",
              color: period === p ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {p === "week" ? "Semaine" : p === "month" ? "Mois" : "Année"}
          </button>
        ))}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-1.5">
        {METRICS.map(m => (
          <div key={m.label} className="rounded-xl p-2.5" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{m.icon}</span>
              <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{m.label}</span>
            </div>
            <div className="flex items-end gap-1.5 mt-1">
              <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>{m.value}</p>
              <span className="text-[9px] font-semibold" style={{
                color: m.changeType === "positive" ? "hsl(var(--success))" : m.changeType === "negative" ? "hsl(var(--destructive))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>{m.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CO2 chart */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text))" }}>🌍 Émissions CO₂ (g/livraison)</p>
        <div className="flex items-end gap-1 h-[60px]">
          {hourlyChart.map((v, i) => (
            <motion.div key={i} className="flex-1 rounded-t-sm"
              initial={{ height: 0 }} animate={{ height: `${(v / 65) * 100}%` }}
              style={{ background: v <= 40 ? "hsl(var(--success) / 0.6)" : v <= 55 ? "hsl(var(--warning) / 0.6)" : "hsl(var(--destructive) / 0.6)" }} />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Jan</span>
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Déc</span>
        </div>
      </div>

      {/* Fleet breakdown */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>🚗 Flotte — Mix énergétique</p>
          <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>{evPercent}% vert</span>
        </div>
        {VEHICLES.map(v => (
          <div key={v.type} className="flex items-center gap-2">
            <span className="text-sm w-6 text-center">{v.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{v.type}</span>
                <span className="text-[8px]" style={{ color: v.isEV ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {v.isEV ? "0g CO₂" : `${v.co2PerKm}g/km`}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{v.count} véhicules</span>
                <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{(v.totalKm / 1000).toFixed(1)}k km</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CSR Goals */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg, hsl(var(--success) / 0.04), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--success) / 0.1)" }}>
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>🎯 Objectifs RSE</p>
        {CSR_GOALS.map(g => {
          const percent = Math.round((g.current / g.target) * 100);
          return (
            <div key={g.id} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{g.label}</span>
                <span className="text-[8px]" style={{ color: percent >= 75 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                  {g.current}{g.unit} / {g.target}{g.unit}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${percent}%` }}
                  style={{ background: percent >= 75 ? "hsl(var(--success))" : percent >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }} />
              </div>
              <p className="text-[7px] text-right" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Échéance: {g.deadline}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
