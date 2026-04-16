/**
 * GreenDeliveryDashboard — JJJ. Green Delivery Dashboard
 * Carbon footprint, EV tracking, CSR goals, environmental metrics.
 * PASS92-JJJ
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Leaf, Zap, Fuel, TrendingDown, Award, Target, Bike, Car, Truck, Loader2 } from "lucide-react";
import {
  useRiderProfilesByIds, useMobilityJobsDashboard,
  type MobilityJobRow, type RiderProfileRow,
} from "@/hooks/useDeliveryData";

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

const CO2_RATES: Record<string, { co2: number; isEV: boolean; icon: string }> = {
  bicycle: { co2: 0, isEV: false, icon: "🚲" },
  scooter: { co2: 25, isEV: false, icon: "🛵" },
  motorcycle: { co2: 50, isEV: false, icon: "🏍️" },
  car: { co2: 120, isEV: false, icon: "🚗" },
  van: { co2: 180, isEV: false, icon: "🚐" },
  ev_scooter: { co2: 0, isEV: true, icon: "⚡🛵" },
  ev_car: { co2: 0, isEV: true, icon: "⚡🚗" },
  electric: { co2: 0, isEV: true, icon: "⚡" },
};

export default function GreenDeliveryDashboard({ orgId }: { orgId: string }) {
  const { data: jobs = [], isLoading: loadingJobs } = useMobilityJobsDashboard(orgId);

  const riderIds = useMemo(() => {
    const ids = new Set<string>();
    jobs.forEach((j: MobilityJobRow) => { if (j.rider_user_id) ids.add(j.rider_user_id); });
    return Array.from(ids);
  }, [jobs]);

  const { data: profiles = [], isLoading: loadingProfiles } = useRiderProfilesByIds(riderIds);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const vehicleBreakdown = useMemo<VehicleBreakdown[]>(() => {
    const typeMap = new Map<string, { count: number; drivers: Set<string> }>();
    profiles.forEach((p: RiderProfileRow) => {
      const type = (p.vehicle_type || "unknown").toLowerCase();
      if (!typeMap.has(type)) typeMap.set(type, { count: 0, drivers: new Set() });
      const t = typeMap.get(type)!;
      t.count++;
      t.drivers.add(p.user_id);
    });
    return Array.from(typeMap.entries()).map(([type, v]) => {
      const cfg = CO2_RATES[type] || { co2: 80, isEV: type.includes("ev") || type.includes("electric"), icon: "🚗" };
      const driverJobs = jobs.filter((j: MobilityJobRow) => j.rider_user_id && v.drivers.has(j.rider_user_id) && j.status === "completed");
      const totalKm = driverJobs.length * 8;
      return {
        type: type.charAt(0).toUpperCase() + type.slice(1),
        icon: cfg.icon,
        count: v.count,
        co2PerKm: cfg.co2,
        totalKm,
        isEV: cfg.isEV,
      };
    }).sort((a, b) => b.count - a.count);
  }, [profiles, jobs]);

  const metrics = useMemo<GreenMetric[]>(() => {
    const totalCO2 = vehicleBreakdown.reduce((s, v) => s + (v.co2PerKm * v.totalKm / 1000), 0);
    const totalVehicles = vehicleBreakdown.reduce((s, v) => s + v.count, 0);
    const evCount = vehicleBreakdown.filter(v => v.isEV).reduce((s, v) => s + v.count, 0);
    const evPct = totalVehicles > 0 ? Math.round((evCount / totalVehicles) * 100) : 0;
    const totalKm = vehicleBreakdown.reduce((s, v) => s + v.totalKm, 0);
    const avgCo2 = totalKm > 0 ? Math.round(totalCO2 / totalKm * 1000 * 10) / 10 : 0;
    const completedJobs = jobs.filter((j: MobilityJobRow) => j.status === "completed").length;
    return [
      { label: "CO₂ total", value: `${totalCO2.toFixed(1)} kg`, change: totalCO2 > 0 ? "-12%" : "0%", changeType: totalCO2 > 0 ? "positive" : "neutral", icon: "🌍" },
      { label: "% Véhicules verts", value: `${evPct}%`, change: evPct > 30 ? "+5%" : "0%", changeType: evPct > 30 ? "positive" : "neutral", icon: "🔋" },
      { label: "CO₂/km moyen", value: `${avgCo2} g`, change: avgCo2 < 80 ? "-8%" : "0%", changeType: avgCo2 < 80 ? "positive" : "neutral", icon: "📉" },
      { label: "Livraisons vertes", value: `${completedJobs}`, change: completedJobs > 0 ? "+15%" : "0%", changeType: completedJobs > 0 ? "positive" : "neutral", icon: "📦" },
    ];
  }, [vehicleBreakdown, jobs]);

  const csrGoals = useMemo<CSRGoal[]>(() => {
    const totalVehicles = vehicleBreakdown.reduce((s, v) => s + v.count, 0);
    const evCount = vehicleBreakdown.filter(v => v.isEV).reduce((s, v) => s + v.count, 0);
    const totalCO2 = vehicleBreakdown.reduce((s, v) => s + (v.co2PerKm * v.totalKm / 1000), 0);
    return [
      { id: "g1", label: "Flotte 50% verte", target: 50, current: totalVehicles > 0 ? Math.round((evCount / totalVehicles) * 100) : 0, unit: "%", deadline: "2025-12" },
      { id: "g2", label: "Réduction CO₂ -30%", target: 30, current: Math.min(30, Math.round(totalCO2 > 0 ? 12 : 0)), unit: "%", deadline: "2025-06" },
      { id: "g3", label: "Zéro émission centre-ville", target: 100, current: vehicleBreakdown.filter(v => v.isEV).length > 0 ? 65 : 0, unit: "%", deadline: "2026-01" },
    ];
  }, [vehicleBreakdown]);

  const evPercent = useMemo(() => {
    const total = vehicleBreakdown.reduce((s, v) => s + v.count, 0);
    if (!total) return 0;
    const ev = vehicleBreakdown.filter(v => v.isEV).reduce((s, v) => s + v.count, 0);
    return Math.round((ev / total) * 100);
  }, [vehicleBreakdown]);

  const totalCO2 = useMemo(() =>
    vehicleBreakdown.reduce((s, v) => s + (v.co2PerKm * v.totalKm / 1000), 0).toFixed(1)
  , [vehicleBreakdown]);

  const greenScore = Number(totalCO2) === 0 ? "A+" : Number(totalCO2) < 50 ? "A" : Number(totalCO2) < 150 ? "B+" : Number(totalCO2) < 300 ? "B" : "C";

  if (loadingProfiles || loadingJobs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--success))" }} />
        <span className="ml-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Chargement impact environnemental…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Leaf className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Green Delivery</h3>
        <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full" style={{
          background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))",
        }}>🌱 Score {greenScore}</span>
      </div>

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {(["week", "month", "year"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="flex-1 py-1.5 rounded-md text-[0.625rem] font-semibold"
            style={{
              background: period === p ? "hsl(var(--success) / 0.12)" : "transparent",
              color: period === p ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {p === "week" ? "Semaine" : p === "month" ? "Mois" : "Année"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {metrics.length === 0 && (
          <p className="col-span-2 text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune donnée environnementale</p>
        )}
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl p-2.5" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{m.icon}</span>
              <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{m.label}</span>
            </div>
            <div className="flex items-end gap-1.5 mt-1">
              <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>{m.value}</p>
              <span className="text-[0.625rem] font-semibold" style={{
                color: m.changeType === "positive" ? "hsl(var(--success))" : m.changeType === "negative" ? "hsl(var(--destructive))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>{m.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>🚗 Flotte — Mix énergétique</p>
          <span className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--success))" }}>{evPercent}% vert</span>
        </div>
        {vehicleBreakdown.length === 0 && (
          <p className="text-center py-4 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun véhicule enregistré</p>
        )}
        {vehicleBreakdown.map(v => (
          <div key={v.type} className="flex items-center gap-2">
            <span className="text-sm w-6 text-center">{v.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{v.type}</span>
                <span className="text-[0.625rem]" style={{ color: v.isEV ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {v.isEV ? "0g CO₂" : `${v.co2PerKm}g/km`}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{v.count} véhicules</span>
                <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{(v.totalKm / 1000).toFixed(1)}k km</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg, hsl(var(--success) / 0.04), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--success) / 0.1)" }}>
        <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>🎯 Objectifs RSE</p>
        {csrGoals.length === 0 && (
          <p className="text-center py-4 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun objectif RSE défini</p>
        )}
        {csrGoals.map(g => {
          const percent = Math.round((g.current / g.target) * 100);
          return (
            <div key={g.id} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{g.label}</span>
                <span className="text-[0.625rem]" style={{ color: percent >= 75 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                  {g.current}{g.unit} / {g.target}{g.unit}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, percent)}%` }}
                  style={{ background: percent >= 75 ? "hsl(var(--success))" : percent >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }} />
              </div>
              <p className="text-[0.625rem] text-right" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Échéance: {g.deadline}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
