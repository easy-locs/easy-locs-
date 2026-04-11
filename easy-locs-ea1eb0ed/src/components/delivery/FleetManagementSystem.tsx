/**
 * FleetManagementSystem — KKK. Fleet Management
 * Vehicles, preventive maintenance, insurance, operational costs, technical alerts.
 * PASS93-KKK
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Wrench, Shield, DollarSign, AlertTriangle, Plus, Calendar, Fuel, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriverSessions, useDeliveryJobs } from "@/hooks/useDeliveryData";

export default function FleetManagementSystem({ orgId }: { orgId: string }) {
  const { data: vehicles = [], isLoading: loadingV } = useDriverSessions(orgId);
  const { data: maintenance = [], isLoading: loadingM } = useDeliveryJobs(orgId);
  const [tab, setTab] = useState<"vehicles" | "maintenance" | "costs" | "alerts">("vehicles");

  if (loadingV || loadingM) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const allVehicles = vehicles as any[];
  const allMaintenance = maintenance as any[];

  const alerts = useMemo(() => {
    const a: { type: string; message: string; severity: "critical" | "warning" | "info"; vehicleId: string }[] = [];
    const now = new Date();
    allVehicles.forEach((v: any) => {
      const insuranceExpiry = v.insurance_expiry || v.insuranceExpiry;
      const nextService = v.next_service || v.nextService;
      const healthScore = v.health_score || v.healthScore || 100;
      const plate = v.plate || v.vehicle_plate || v.id;
      if (insuranceExpiry && new Date(insuranceExpiry) <= new Date(now.getTime() + 30 * 86400000)) {
        a.push({ type: "insurance", message: `${plate} — Assurance expire le ${insuranceExpiry}`, severity: "critical", vehicleId: v.id });
      }
      if (nextService && new Date(nextService) <= new Date(now.getTime() + 14 * 86400000)) {
        a.push({ type: "maintenance", message: `${plate} — Entretien prévu le ${nextService}`, severity: "warning", vehicleId: v.id });
      }
      if (healthScore < 50) {
        a.push({ type: "health", message: `${plate} — Score santé critique: ${healthScore}%`, severity: "critical", vehicleId: v.id });
      }
    });
    return a;
  }, [allVehicles]);

  const costStats = useMemo(() => {
    const totalFuel = allVehicles.reduce((s: number, v: any) => s + (v.monthly_fuel_cost || v.monthlyFuelCost || 0), 0);
    const totalMaint = allVehicles.reduce((s: number, v: any) => s + (v.monthly_maint_cost || v.monthlyMaintCost || 0), 0);
    const avgHealth = allVehicles.length > 0 ? Math.round(allVehicles.reduce((s: number, v: any) => s + (v.health_score || v.healthScore || 100), 0) / allVehicles.length) : 0;
    return { totalFuel, totalMaint, total: totalFuel + totalMaint, avgHealth };
  }, [allVehicles]);

  const typeIcon: Record<string, string> = { van: "🚐", truck: "🚛", bike: "🚲", car: "🚗", ev: "⚡" };
  const statusCfg: Record<string, { color: string; label: string }> = {
    active: { color: "hsl(var(--success))", label: "Actif" },
    maintenance: { color: "hsl(var(--warning))", label: "Maintenance" },
    inactive: { color: "hsl(var(--destructive))", label: "Inactif" },
    online: { color: "hsl(var(--success))", label: "En ligne" },
    offline: { color: "hsl(var(--destructive))", label: "Hors ligne" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Gestion de Flotte</h3>
        {alerts.filter(a => a.severity === "critical").length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
            ⚠️ {alerts.filter(a => a.severity === "critical").length} critique{alerts.filter(a => a.severity === "critical").length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Véhicules", value: allVehicles.length, color: "--info" },
          { label: "Actifs", value: allVehicles.filter((v: any) => v.status === "active" || v.status === "online").length, color: "--success" },
          { label: "Coûts/mois", value: `${costStats.total}€`, color: "--warning" },
          { label: "Santé moy.", value: `${costStats.avgHealth}%`, color: costStats.avgHealth > 70 ? "--success" : "--destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
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
            {allVehicles.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun véhicule</div>
            )}
            {allVehicles.map((v: any) => {
              const st = statusCfg[v.status] || statusCfg.active;
              const healthScore = v.health_score || v.healthScore || 100;
              const healthColor = healthScore > 70 ? "hsl(var(--success))" : healthScore > 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
              const plate = v.plate || v.vehicle_plate || "";
              const model = v.model || v.vehicle_model || "";
              const mileage = v.mileage || 0;
              const assignedDriver = v.assigned_driver || v.assignedDriver || v.driver_name || "";
              const monthlyFuelCost = v.monthly_fuel_cost || v.monthlyFuelCost || 0;
              const monthlyMaintCost = v.monthly_maint_cost || v.monthlyMaintCost || 0;
              const nextService = v.next_service || v.nextService || "";
              return (
                <div key={v.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${st.color}15` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeIcon[v.type] || "🚐"}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{model || plate}</p>
                      <p className="text-[10px] font-mono" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{plate} • {Number(mileage).toLocaleString()} km</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Santé</span>
                        <span style={{ color: healthColor }}>{healthScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${healthScore}%`, background: healthColor }} />
                      </div>
                    </div>
                    {assignedDriver && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "hsl(var(--info) / 0.08)", color: "hsl(var(--info))" }}>
                        👤 {assignedDriver}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                    <span>⛽ {monthlyFuelCost}€/mois</span>
                    <span>🔧 {monthlyMaintCost}€/mois</span>
                    {nextService && <span>📅 Prochain: {nextService}</span>}
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
            {allMaintenance.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun entretien</div>
            )}
            {allMaintenance.map((m: any) => {
              const vehicle = allVehicles.find((v: any) => v.id === (m.vehicle_id || m.vehicleId));
              const typeCfg: Record<string, { color: string; label: string; emoji: string }> = {
                preventive: { color: "hsl(var(--info))", label: "Préventif", emoji: "🔵" },
                corrective: { color: "hsl(var(--warning))", label: "Correctif", emoji: "🟠" },
                inspection: { color: "hsl(var(--hud-cyan))", label: "Inspection", emoji: "🔍" },
              };
              const cfg = typeCfg[m.type] || { color: "hsl(var(--info))", label: m.type || "Tâche", emoji: "🔵" };
              const stCfg: Record<string, { color: string; label: string }> = {
                scheduled: { color: "hsl(var(--info))", label: "Planifié" },
                in_progress: { color: "hsl(var(--warning))", label: "En cours" },
                completed: { color: "hsl(var(--success))", label: "Terminé" },
              };
              const st = stCfg[m.status] || stCfg.scheduled;
              const plate = vehicle?.plate || vehicle?.vehicle_plate || m.plate || m.vehicle_plate || "";
              return (
                <div key={m.id} className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cfg.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{m.description || m.title || cfg.label}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        {plate} • {m.date || m.scheduled_date || m.created_at || ""} • {m.cost || 0}€
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: st.color }}>{st.label}</span>
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
                { label: "Total", value: costStats.total, color: "hsl(var(--destructive))", icon: "💰" },
              ].map(c => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{c.icon} {c.label}</span>
                  <span className="text-[11px] font-bold" style={{ color: c.color }}>{c.value}€</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Coût par véhicule</p>
              {allVehicles.filter((v: any) => v.status === "active" || v.status === "online").map((v: any) => {
                const plate = v.plate || v.vehicle_plate || v.id;
                const fuelCost = v.monthly_fuel_cost || v.monthlyFuelCost || 0;
                const maintCost = v.monthly_maint_cost || v.monthlyMaintCost || 0;
                return (
                  <div key={v.id} className="flex items-center justify-between text-[10px]">
                    <span style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{typeIcon[v.type] || "🚐"} {plate}</span>
                    <span className="font-bold" style={{ color: "hsl(var(--warning))" }}>{fuelCost + maintCost}€/mois</span>
                  </div>
                );
              })}
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
