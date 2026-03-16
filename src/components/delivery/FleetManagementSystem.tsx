/**
 * FleetManagementSystem — KKK. Fleet Management
 * Vehicles, preventive maintenance, insurance, operational costs, technical alerts.
 * PASS93-KKK
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Wrench, Shield, DollarSign, AlertTriangle, Plus, Calendar, Fuel, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: "van" | "truck" | "bike" | "car" | "ev";
  status: "active" | "maintenance" | "inactive";
  mileage: number;
  fuelType: "diesel" | "gasoline" | "electric" | "hybrid";
  lastService: string;
  nextService: string;
  insuranceExpiry: string;
  monthlyFuelCost: number;
  monthlyMaintCost: number;
  assignedDriver?: string;
  healthScore: number;
}

const MOCK_VEHICLES: Vehicle[] = [
  { id: "v1", plate: "AB-123-CD", model: "Renault Master", type: "van", status: "active", mileage: 45200, fuelType: "diesel", lastService: "2026-02-15", nextService: "2026-04-15", insuranceExpiry: "2026-08-01", monthlyFuelCost: 380, monthlyMaintCost: 120, assignedDriver: "Thomas D.", healthScore: 87 },
  { id: "v2", plate: "EF-456-GH", model: "Peugeot e-Expert", type: "ev", status: "active", mileage: 22100, fuelType: "electric", lastService: "2026-03-01", nextService: "2026-06-01", insuranceExpiry: "2026-12-15", monthlyFuelCost: 95, monthlyMaintCost: 45, assignedDriver: "Marie L.", healthScore: 95 },
  { id: "v3", plate: "IJ-789-KL", model: "Citroën Berlingo", type: "van", status: "maintenance", mileage: 78500, fuelType: "diesel", lastService: "2026-03-10", nextService: "2026-03-20", insuranceExpiry: "2026-05-30", monthlyFuelCost: 420, monthlyMaintCost: 280, healthScore: 52 },
  { id: "v4", plate: "MN-012-OP", model: "Vélo cargo élec.", type: "bike", status: "active", mileage: 3200, fuelType: "electric", lastService: "2026-02-28", nextService: "2026-05-28", insuranceExpiry: "2027-01-01", monthlyFuelCost: 15, monthlyMaintCost: 30, assignedDriver: "Karim B.", healthScore: 98 },
  { id: "v5", plate: "QR-345-ST", model: "Mercedes Sprinter", type: "truck", status: "inactive", mileage: 120300, fuelType: "diesel", lastService: "2026-01-20", nextService: "2026-03-20", insuranceExpiry: "2026-04-01", monthlyFuelCost: 0, monthlyMaintCost: 0, healthScore: 31 },
];

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: "preventive" | "corrective" | "inspection";
  description: string;
  cost: number;
  date: string;
  status: "scheduled" | "in_progress" | "completed";
}

const MOCK_MAINTENANCE: MaintenanceLog[] = [
  { id: "m1", vehicleId: "v3", type: "corrective", description: "Remplacement courroie distribution", cost: 650, date: "2026-03-16", status: "in_progress" },
  { id: "m2", vehicleId: "v1", type: "preventive", description: "Vidange + filtres", cost: 180, date: "2026-04-15", status: "scheduled" },
  { id: "m3", vehicleId: "v5", type: "inspection", description: "Contrôle technique obligatoire", cost: 75, date: "2026-03-20", status: "scheduled" },
  { id: "m4", vehicleId: "v2", type: "preventive", description: "Rotation pneus + freins", cost: 220, date: "2026-06-01", status: "scheduled" },
  { id: "m5", vehicleId: "v1", type: "corrective", description: "Remplacement rétroviseur", cost: 95, date: "2026-03-05", status: "completed" },
];

export default function FleetManagementSystem({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"vehicles" | "maintenance" | "costs" | "alerts">("vehicles");

  const alerts = useMemo(() => {
    const a: { type: string; message: string; severity: "critical" | "warning" | "info"; vehicleId: string }[] = [];
    const now = new Date();
    MOCK_VEHICLES.forEach(v => {
      if (new Date(v.insuranceExpiry) <= new Date(now.getTime() + 30 * 86400000)) {
        a.push({ type: "insurance", message: `${v.plate} — Assurance expire le ${v.insuranceExpiry}`, severity: "critical", vehicleId: v.id });
      }
      if (new Date(v.nextService) <= new Date(now.getTime() + 14 * 86400000)) {
        a.push({ type: "maintenance", message: `${v.plate} — Entretien prévu le ${v.nextService}`, severity: "warning", vehicleId: v.id });
      }
      if (v.healthScore < 50) {
        a.push({ type: "health", message: `${v.plate} — Score santé critique: ${v.healthScore}%`, severity: "critical", vehicleId: v.id });
      }
    });
    return a;
  }, []);

  const costStats = useMemo(() => {
    const totalFuel = MOCK_VEHICLES.reduce((s, v) => s + v.monthlyFuelCost, 0);
    const totalMaint = MOCK_VEHICLES.reduce((s, v) => s + v.monthlyMaintCost, 0);
    const avgHealth = Math.round(MOCK_VEHICLES.reduce((s, v) => s + v.healthScore, 0) / MOCK_VEHICLES.length);
    return { totalFuel, totalMaint, total: totalFuel + totalMaint, avgHealth };
  }, []);

  const typeIcon: Record<string, string> = { van: "🚐", truck: "🚛", bike: "🚲", car: "🚗", ev: "⚡" };
  const statusCfg: Record<string, { color: string; label: string }> = {
    active: { color: "hsl(var(--success))", label: "Actif" },
    maintenance: { color: "hsl(var(--warning))", label: "Maintenance" },
    inactive: { color: "hsl(var(--destructive))", label: "Inactif" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Gestion de Flotte</h3>
        {alerts.filter(a => a.severity === "critical").length > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
            ⚠️ {alerts.filter(a => a.severity === "critical").length} critique{alerts.filter(a => a.severity === "critical").length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Véhicules", value: MOCK_VEHICLES.length, color: "--info" },
          { label: "Actifs", value: MOCK_VEHICLES.filter(v => v.status === "active").length, color: "--success" },
          { label: "Coûts/mois", value: `${costStats.total}€`, color: "--warning" },
          { label: "Santé moy.", value: `${costStats.avgHealth}%`, color: costStats.avgHealth > 70 ? "--success" : "--destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "vehicles" as const, label: "🚐 Véhicules" },
          { id: "maintenance" as const, label: "🔧 Entretien" },
          { id: "costs" as const, label: "💰 Coûts" },
          { id: "alerts" as const, label: `🚨 Alertes (${alerts.length})` },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--info) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--info))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "vehicles" && (
          <motion.div key="vehicles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_VEHICLES.map(v => {
              const st = statusCfg[v.status];
              const healthColor = v.healthScore > 70 ? "hsl(var(--success))" : v.healthScore > 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
              return (
                <div key={v.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${st.color}15` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeIcon[v.type] || "🚐"}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{v.model}</p>
                      <p className="text-[8px] font-mono" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{v.plate} • {v.mileage.toLocaleString()} km</p>
                    </div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-[8px] mb-0.5">
                        <span style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Santé</span>
                        <span style={{ color: healthColor }}>{v.healthScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${v.healthScore}%`, background: healthColor }} />
                      </div>
                    </div>
                    {v.assignedDriver && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md" style={{ background: "hsl(var(--info) / 0.08)", color: "hsl(var(--info))" }}>
                        👤 {v.assignedDriver}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                    <span>⛽ {v.monthlyFuelCost}€/mois</span>
                    <span>🔧 {v.monthlyMaintCost}€/mois</span>
                    <span>📅 Prochain: {v.nextService}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "maintenance" && (
          <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Button size="sm" className="w-full text-xs h-8" style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
              <Wrench className="h-3.5 w-3.5 mr-1" /> Planifier un entretien
            </Button>
            {MOCK_MAINTENANCE.map(m => {
              const vehicle = MOCK_VEHICLES.find(v => v.id === m.vehicleId);
              const typeCfg: Record<string, { color: string; label: string; emoji: string }> = {
                preventive: { color: "hsl(var(--info))", label: "Préventif", emoji: "🔵" },
                corrective: { color: "hsl(var(--warning))", label: "Correctif", emoji: "🟠" },
                inspection: { color: "hsl(var(--hud-cyan))", label: "Inspection", emoji: "🔍" },
              };
              const cfg = typeCfg[m.type];
              const stCfg: Record<string, { color: string; label: string }> = {
                scheduled: { color: "hsl(var(--info))", label: "Planifié" },
                in_progress: { color: "hsl(var(--warning))", label: "En cours" },
                completed: { color: "hsl(var(--success))", label: "Terminé" },
              };
              const st = stCfg[m.status];
              return (
                <div key={m.id} className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cfg.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{m.description}</p>
                      <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        {vehicle?.plate} • {m.date} • {m.cost}€
                      </p>
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: st.color }}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "costs" && (
          <motion.div key="costs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="rounded-xl p-3 space-y-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Répartition mensuelle</p>
              {[
                { label: "Carburant / Énergie", value: costStats.totalFuel, color: "hsl(var(--warning))", icon: "⛽" },
                { label: "Maintenance", value: costStats.totalMaint, color: "hsl(var(--info))", icon: "🔧" },
                { label: "Assurances", value: 890, color: "hsl(var(--hud-cyan))", icon: "🛡️" },
                { label: "Total", value: costStats.total + 890, color: "hsl(var(--destructive))", icon: "💰" },
              ].map(c => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{c.icon} {c.label}</span>
                  <span className="text-[11px] font-bold" style={{ color: c.color }}>{c.value}€</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Coût par véhicule</p>
              {MOCK_VEHICLES.filter(v => v.status === "active").map(v => (
                <div key={v.id} className="flex items-center justify-between text-[9px]">
                  <span style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{typeIcon[v.type]} {v.plate}</span>
                  <span className="font-bold" style={{ color: "hsl(var(--warning))" }}>{v.monthlyFuelCost + v.monthlyMaintCost}€/mois</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "alerts" && (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[10px]" style={{ color: "hsl(var(--success))" }}>✅ Aucune alerte</p>
              </div>
            ) : alerts.map((a, i) => {
              const sevCfg: Record<string, { color: string; emoji: string }> = {
                critical: { color: "hsl(var(--destructive))", emoji: "🔴" },
                warning: { color: "hsl(var(--warning))", emoji: "🟠" },
                info: { color: "hsl(var(--info))", emoji: "🔵" },
              };
              const cfg = sevCfg[a.severity];
              return (
                <div key={i} className="rounded-xl p-3 flex items-center gap-2" style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}15` }}>
                  <span className="text-sm">{cfg.emoji}</span>
                  <p className="text-[10px] flex-1" style={{ color: "hsl(var(--hud-text))" }}>{a.message}</p>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
