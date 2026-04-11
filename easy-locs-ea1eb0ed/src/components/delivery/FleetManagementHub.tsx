/**
 * FleetManagementHub — UU. Fleet Management Dashboard
 * Vehicle tracking, maintenance schedules, driver documents, alerts.
 * PASS89-UU
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Wrench, FileText, AlertTriangle, CheckCircle2, Clock, Fuel, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useDriverSessions, useDeliveryJobs } from "@/hooks/useDeliveryData";

const VEHICLE_ICONS: Record<string, string> = { car: "🚗", van: "🚐", bike: "🚲", scooter: "🛵", truck: "🚛" };
const TASK_LABELS: Record<string, string> = {
  oil_change: "Vidange", tire_rotation: "Rotation pneus", brake_check: "Freins", general: "Révision", insurance_renewal: "Renouvellement assurance",
};

export default function FleetManagementHub({ orgId }: { orgId: string }) {
  const { data: vehicles = [], isLoading: loadingV } = useDriverSessions(orgId);
  const { data: tasks = [], isLoading: loadingT } = useDeliveryJobs(orgId);
  const [tab, setTab] = useState<"vehicles" | "maintenance" | "alerts">("vehicles");
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  if (loadingV || loadingT) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const allVehicles = vehicles as any[];
  const allTasks = tasks as any[];

  const alerts = useMemo(() => {
    const items: { type: "warning" | "danger"; message: string; vehicleId: string }[] = [];
    allVehicles.forEach((v: any) => {
      const docs = v.documents || [];
      docs.forEach((d: any) => {
        if (d.status === "expired") items.push({ type: "danger", message: `${d.name} expiré — ${v.plate || v.vehicle_plate || v.id}`, vehicleId: v.id });
        if (d.status === "expiring") items.push({ type: "warning", message: `${d.name} expire bientôt — ${v.plate || v.vehicle_plate || v.id}`, vehicleId: v.id });
      });
      const fuelLevel = v.fuel_level || v.fuelLevel || 100;
      if (fuelLevel < 20) items.push({ type: "warning", message: `Carburant bas (${fuelLevel}%) — ${v.plate || v.vehicle_plate || v.id}`, vehicleId: v.id });
    });
    allTasks.filter((t: any) => t.status === "overdue").forEach((t: any) => {
      const label = TASK_LABELS[t.type] || t.type || "Tâche";
      items.push({ type: "danger", message: `Maintenance en retard: ${label} — ${t.plate || t.vehicle_plate || ""}`, vehicleId: t.vehicle_id || t.vehicleId || "" });
    });
    return items;
  }, [allVehicles, allTasks]);

  const filteredVehicles = allVehicles.filter((v: any) =>
    (v.plate || v.vehicle_plate || "").toLowerCase().includes(search.toLowerCase()) ||
    (v.model || v.vehicle_model || "").toLowerCase().includes(search.toLowerCase())
  );

  const detailVehicle = selectedVehicle ? allVehicles.find((v: any) => v.id === selectedVehicle) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Fleet Management</h3>
        {alerts.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))" }}>
            {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "vehicles" as const, label: "🚗 Véhicules", count: allVehicles.length },
          { id: "maintenance" as const, label: "🔧 Maintenance", count: allTasks.filter((t: any) => t.status !== "completed").length },
          { id: "alerts" as const, label: "⚠️ Alertes", count: alerts.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "vehicles" && (
          <motion.div key="vehicles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Input placeholder="Rechercher plaque / modèle…" value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />

            {filteredVehicles.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun véhicule trouvé</div>
            )}

            {filteredVehicles.map((v: any) => {
              const plate = v.plate || v.vehicle_plate || v.id;
              const model = v.model || v.vehicle_model || "";
              const mileage = v.mileage || 0;
              const fuelLevel = v.fuel_level || v.fuelLevel || 100;
              const assignedDriver = v.assigned_driver || v.assignedDriver || v.driver_name || null;
              const lastService = v.last_service || v.lastService || "";
              const nextService = v.next_service || v.nextService || "";
              const docs = v.documents || [];
              return (
                <div key={v.id} className="rounded-xl p-3 space-y-2 cursor-pointer" onClick={() => setSelectedVehicle(selectedVehicle === v.id ? null : v.id)}
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid hsl(var(--hud-border) / ${selectedVehicle === v.id ? "0.3" : "0.08"})` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{VEHICLE_ICONS[v.type] || "🚗"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{plate}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{model}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                      background: (v.status === "active" || v.status === "online") ? "hsl(var(--success) / 0.12)" : v.status === "maintenance" ? "hsl(var(--warning) / 0.12)" : "hsl(var(--muted) / 0.2)",
                      color: (v.status === "active" || v.status === "online") ? "hsl(var(--success))" : v.status === "maintenance" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))",
                    }}>
                      {(v.status === "active" || v.status === "online") ? "✅ Actif" : v.status === "maintenance" ? "🔧 Maintenance" : "⏸️ Inactif"}
                    </span>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Km", value: Number(mileage).toLocaleString(), icon: "🛣️" },
                      { label: "Carburant", value: `${fuelLevel}%`, icon: "⛽" },
                      { label: "Chauffeur", value: assignedDriver || "—", icon: "👤" },
                    ].map(s => (
                      <div key={s.label} className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                        <p className="text-[10px]">{s.icon} {s.label}</p>
                        <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {selectedVehicle === v.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2 pt-2">
                        {docs.length > 0 && (
                          <>
                            <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>📄 Documents</p>
                            {docs.map((d: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                                <FileText className="h-3 w-3" style={{
                                  color: d.status === "valid" ? "hsl(var(--success))" : d.status === "expiring" ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                                }} />
                                <span className="text-[10px] flex-1" style={{ color: "hsl(var(--hud-text))" }}>{d.name}</span>
                                <span className="text-[10px] font-semibold" style={{
                                  color: d.status === "valid" ? "hsl(var(--success))" : d.status === "expiring" ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                                }}>
                                  {d.status === "valid" ? "✅" : d.status === "expiring" ? "⚠️" : "❌"} {d.expiry}
                                </span>
                              </div>
                            ))}
                          </>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="text-center py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Dernier entretien</p>
                            <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{lastService || "—"}</p>
                          </div>
                          <div className="text-center py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Prochain entretien</p>
                            <p className="text-[10px] font-bold" style={{ color: "hsl(var(--warning))" }}>{nextService || "—"}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "maintenance" && (
          <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {allTasks.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucune tâche de maintenance</div>
            )}
            {allTasks.map((t: any) => {
              const statusCfg: Record<string, { color: string; label: string }> = {
                scheduled: { color: "hsl(var(--info))", label: "📅 Planifié" },
                in_progress: { color: "hsl(var(--warning))", label: "🔧 En cours" },
                completed: { color: "hsl(var(--success))", label: "✅ Terminé" },
                overdue: { color: "hsl(var(--destructive))", label: "🚨 En retard" },
              };
              const cfg = statusCfg[t.status] || statusCfg.scheduled;
              const plate = t.plate || t.vehicle_plate || "";
              const dueDate = t.due_date || t.dueDate || t.scheduled_date || t.created_at || "";
              const label = TASK_LABELS[t.type] || t.type || t.title || "Tâche";
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}20` }}>
                  <Wrench className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{label}</p>
                    <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{plate} • Échéance: {dueDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                    {t.cost && <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{t.cost}€</p>}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "alerts" && (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(var(--success) / 0.3)" }} />
                <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucune alerte</p>
              </div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: a.type === "danger" ? "hsl(var(--destructive) / 0.06)" : "hsl(var(--warning) / 0.06)", border: `1px solid ${a.type === "danger" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--warning) / 0.15)"}` }}>
                  <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: a.type === "danger" ? "hsl(var(--destructive))" : "hsl(var(--warning))" }} />
                  <p className="text-[11px] flex-1" style={{ color: "hsl(var(--hud-text))" }}>{a.message}</p>
                  <Button size="sm" className="text-[10px] h-6 px-2" onClick={() => { setTab("vehicles"); setSelectedVehicle(a.vehicleId); }}
                    style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
                    Voir
                  </Button>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
