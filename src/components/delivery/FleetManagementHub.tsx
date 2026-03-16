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

interface Vehicle {
  id: string;
  plate: string;
  type: "car" | "van" | "bike" | "scooter" | "truck";
  model: string;
  status: "active" | "maintenance" | "inactive";
  assignedDriver: string | null;
  mileage: number;
  fuelLevel: number;
  lastService: string;
  nextService: string;
  insuranceExpiry: string;
  documents: { name: string; status: "valid" | "expiring" | "expired"; expiry: string }[];
}

interface MaintenanceTask {
  id: string;
  vehicleId: string;
  plate: string;
  type: "oil_change" | "tire_rotation" | "brake_check" | "general" | "insurance_renewal";
  status: "scheduled" | "in_progress" | "completed" | "overdue";
  dueDate: string;
  cost?: number;
}

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "v1", plate: "AB-123-CD", type: "van", model: "Renault Kangoo 2024",
    status: "active", assignedDriver: "Mohamed K.", mileage: 42350, fuelLevel: 72,
    lastService: "2026-01-15", nextService: "2026-04-15", insuranceExpiry: "2026-09-30",
    documents: [
      { name: "Carte grise", status: "valid", expiry: "2027-06-01" },
      { name: "Assurance", status: "valid", expiry: "2026-09-30" },
      { name: "Contrôle technique", status: "expiring", expiry: "2026-04-20" },
    ],
  },
  {
    id: "v2", plate: "EF-456-GH", type: "scooter", model: "Yamaha NMAX 125",
    status: "active", assignedDriver: "Ali B.", mileage: 18200, fuelLevel: 45,
    lastService: "2026-02-20", nextService: "2026-05-20", insuranceExpiry: "2026-06-15",
    documents: [
      { name: "Carte grise", status: "valid", expiry: "2028-01-01" },
      { name: "Assurance", status: "expiring", expiry: "2026-06-15" },
    ],
  },
  {
    id: "v3", plate: "IJ-789-KL", type: "car", model: "Peugeot 208",
    status: "maintenance", assignedDriver: null, mileage: 67800, fuelLevel: 30,
    lastService: "2025-11-10", nextService: "2026-02-10", insuranceExpiry: "2026-12-01",
    documents: [
      { name: "Carte grise", status: "valid", expiry: "2027-03-01" },
      { name: "Assurance", status: "valid", expiry: "2026-12-01" },
      { name: "Contrôle technique", status: "expired", expiry: "2026-01-15" },
    ],
  },
];

const MOCK_TASKS: MaintenanceTask[] = [
  { id: "m1", vehicleId: "v1", plate: "AB-123-CD", type: "tire_rotation", status: "scheduled", dueDate: "2026-04-01", cost: 120 },
  { id: "m2", vehicleId: "v3", plate: "IJ-789-KL", type: "brake_check", status: "overdue", dueDate: "2026-02-10", cost: 250 },
  { id: "m3", vehicleId: "v2", plate: "EF-456-GH", type: "oil_change", status: "completed", dueDate: "2026-02-20", cost: 65 },
  { id: "m4", vehicleId: "v3", plate: "IJ-789-KL", type: "general", status: "in_progress", dueDate: "2026-03-15", cost: 400 },
];

const VEHICLE_ICONS: Record<string, string> = { car: "🚗", van: "🚐", bike: "🚲", scooter: "🛵", truck: "🚛" };
const TASK_LABELS: Record<string, string> = {
  oil_change: "Vidange", tire_rotation: "Rotation pneus", brake_check: "Freins", general: "Révision", insurance_renewal: "Renouvellement assurance",
};

export default function FleetManagementHub({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"vehicles" | "maintenance" | "alerts">("vehicles");
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const alerts = useMemo(() => {
    const items: { type: "warning" | "danger"; message: string; vehicleId: string }[] = [];
    MOCK_VEHICLES.forEach(v => {
      v.documents.forEach(d => {
        if (d.status === "expired") items.push({ type: "danger", message: `${d.name} expiré — ${v.plate}`, vehicleId: v.id });
        if (d.status === "expiring") items.push({ type: "warning", message: `${d.name} expire bientôt — ${v.plate}`, vehicleId: v.id });
      });
      if (v.fuelLevel < 20) items.push({ type: "warning", message: `Carburant bas (${v.fuelLevel}%) — ${v.plate}`, vehicleId: v.id });
    });
    MOCK_TASKS.filter(t => t.status === "overdue").forEach(t => {
      items.push({ type: "danger", message: `Maintenance en retard: ${TASK_LABELS[t.type]} — ${t.plate}`, vehicleId: t.vehicleId });
    });
    return items;
  }, []);

  const filteredVehicles = MOCK_VEHICLES.filter(v =>
    v.plate.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  );

  const detailVehicle = selectedVehicle ? MOCK_VEHICLES.find(v => v.id === selectedVehicle) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Fleet Management</h3>
        {alerts.length > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))" }}>
            {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "vehicles" as const, label: "🚗 Véhicules", count: MOCK_VEHICLES.length },
          { id: "maintenance" as const, label: "🔧 Maintenance", count: MOCK_TASKS.filter(t => t.status !== "completed").length },
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

            {filteredVehicles.map(v => (
              <div key={v.id} className="rounded-xl p-3 space-y-2 cursor-pointer" onClick={() => setSelectedVehicle(selectedVehicle === v.id ? null : v.id)}
                style={{ background: "hsl(var(--hud-surface))", border: `1px solid hsl(var(--hud-border) / ${selectedVehicle === v.id ? "0.3" : "0.08"})` }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{VEHICLE_ICONS[v.type] || "🚗"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{v.plate}</p>
                    <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{v.model}</p>
                  </div>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{
                    background: v.status === "active" ? "hsl(var(--success) / 0.12)" : v.status === "maintenance" ? "hsl(var(--warning) / 0.12)" : "hsl(var(--muted) / 0.2)",
                    color: v.status === "active" ? "hsl(var(--success))" : v.status === "maintenance" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))",
                  }}>
                    {v.status === "active" ? "✅ Actif" : v.status === "maintenance" ? "🔧 Maintenance" : "⏸️ Inactif"}
                  </span>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Km", value: v.mileage.toLocaleString(), icon: "🛣️" },
                    { label: "Carburant", value: `${v.fuelLevel}%`, icon: "⛽" },
                    { label: "Chauffeur", value: v.assignedDriver || "—", icon: "👤" },
                  ].map(s => (
                    <div key={s.label} className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                      <p className="text-[9px]">{s.icon} {s.label}</p>
                      <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {selectedVehicle === v.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2 pt-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>📄 Documents</p>
                      {v.documents.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                          <FileText className="h-3 w-3" style={{
                            color: d.status === "valid" ? "hsl(var(--success))" : d.status === "expiring" ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                          }} />
                          <span className="text-[10px] flex-1" style={{ color: "hsl(var(--hud-text))" }}>{d.name}</span>
                          <span className="text-[9px] font-semibold" style={{
                            color: d.status === "valid" ? "hsl(var(--success))" : d.status === "expiring" ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                          }}>
                            {d.status === "valid" ? "✅" : d.status === "expiring" ? "⚠️" : "❌"} {d.expiry}
                          </span>
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="text-center py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                          <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Dernier entretien</p>
                          <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{v.lastService}</p>
                        </div>
                        <div className="text-center py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                          <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Prochain entretien</p>
                          <p className="text-[10px] font-bold" style={{ color: "hsl(var(--warning))" }}>{v.nextService}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}

        {tab === "maintenance" && (
          <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_TASKS.map(t => {
              const statusCfg: Record<string, { color: string; label: string }> = {
                scheduled: { color: "hsl(var(--info))", label: "📅 Planifié" },
                in_progress: { color: "hsl(var(--warning))", label: "🔧 En cours" },
                completed: { color: "hsl(var(--success))", label: "✅ Terminé" },
                overdue: { color: "hsl(var(--destructive))", label: "🚨 En retard" },
              };
              const cfg = statusCfg[t.status] || statusCfg.scheduled;
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}20` }}>
                  <Wrench className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{TASK_LABELS[t.type]}</p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{t.plate} • Échéance: {t.dueDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
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
                  <Button size="sm" className="text-[9px] h-6 px-2" onClick={() => { setTab("vehicles"); setSelectedVehicle(a.vehicleId); }}
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
