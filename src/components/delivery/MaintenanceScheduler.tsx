/**
 * MaintenanceScheduler — RRR. Maintenance Scheduler
 * Preventive maintenance planning with automatic reminders and full history.
 * PASS94-RRR
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Calendar, Bell, CheckCircle2, Clock, AlertTriangle, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceTask {
  id: string;
  vehiclePlate: string;
  vehicleModel: string;
  type: "oil_change" | "tires" | "brakes" | "inspection" | "battery" | "filters" | "timing_belt" | "general";
  description: string;
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  status: "upcoming" | "overdue" | "in_progress" | "completed";
  mileageTrigger?: number;
  intervalMonths: number;
  priority: "low" | "medium" | "high" | "critical";
  notes?: string;
  technician?: string;
}

const MOCK_TASKS: MaintenanceTask[] = [
  { id: "mt1", vehiclePlate: "AB-123-CD", vehicleModel: "Renault Master", type: "oil_change", description: "Vidange + remplacement filtres", scheduledDate: "2026-03-20", status: "upcoming", intervalMonths: 6, priority: "medium", mileageTrigger: 50000 },
  { id: "mt2", vehiclePlate: "IJ-789-KL", vehicleModel: "Citroën Berlingo", type: "timing_belt", description: "Remplacement courroie de distribution", scheduledDate: "2026-03-16", status: "in_progress", intervalMonths: 48, priority: "critical", cost: 650, technician: "Garage Central Paris" },
  { id: "mt3", vehiclePlate: "QR-345-ST", vehicleModel: "Mercedes Sprinter", type: "inspection", description: "Contrôle technique obligatoire", scheduledDate: "2026-03-18", status: "overdue", intervalMonths: 24, priority: "high" },
  { id: "mt4", vehiclePlate: "EF-456-GH", vehicleModel: "Peugeot e-Expert", type: "tires", description: "Rotation pneus + vérification freins", scheduledDate: "2026-04-15", status: "upcoming", intervalMonths: 12, priority: "low" },
  { id: "mt5", vehiclePlate: "MN-012-OP", vehicleModel: "Vélo cargo élec.", type: "battery", description: "Diagnostic batterie + calibration", scheduledDate: "2026-05-01", status: "upcoming", intervalMonths: 6, priority: "low" },
  { id: "mt6", vehiclePlate: "AB-123-CD", vehicleModel: "Renault Master", type: "brakes", description: "Remplacement plaquettes de frein", scheduledDate: "2026-02-28", completedDate: "2026-02-28", status: "completed", intervalMonths: 12, priority: "high", cost: 320, technician: "AutoService Lyon" },
  { id: "mt7", vehiclePlate: "EF-456-GH", vehicleModel: "Peugeot e-Expert", type: "general", description: "Révision générale 20 000 km", scheduledDate: "2026-03-01", completedDate: "2026-03-02", status: "completed", intervalMonths: 12, priority: "medium", cost: 180, technician: "EV Specialist" },
  { id: "mt8", vehiclePlate: "IJ-789-KL", vehicleModel: "Citroën Berlingo", type: "filters", description: "Filtre à air + filtre habitacle", scheduledDate: "2026-01-15", completedDate: "2026-01-16", status: "completed", intervalMonths: 12, priority: "low", cost: 85, technician: "Garage Central Paris" },
];

export default function MaintenanceScheduler({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"upcoming" | "history" | "reminders">("upcoming");

  const upcoming = MOCK_TASKS.filter(t => ["upcoming", "overdue", "in_progress"].includes(t.status))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  const history = MOCK_TASKS.filter(t => t.status === "completed")
    .sort((a, b) => new Date(b.completedDate || b.scheduledDate).getTime() - new Date(a.completedDate || a.scheduledDate).getTime());

  const totalCostHistory = history.reduce((s, t) => s + (t.cost || 0), 0);
  const overdueCount = upcoming.filter(t => t.status === "overdue").length;

  const typeCfg: Record<string, { emoji: string; label: string }> = {
    oil_change: { emoji: "🛢️", label: "Vidange" },
    tires: { emoji: "🔘", label: "Pneus" },
    brakes: { emoji: "🛑", label: "Freins" },
    inspection: { emoji: "🔍", label: "Contrôle" },
    battery: { emoji: "🔋", label: "Batterie" },
    filters: { emoji: "🌬️", label: "Filtres" },
    timing_belt: { emoji: "⚙️", label: "Courroie" },
    general: { emoji: "🔧", label: "Révision" },
  };

  const priorityCfg: Record<string, { color: string; label: string }> = {
    low: { color: "hsl(var(--info))", label: "Faible" },
    medium: { color: "hsl(var(--warning))", label: "Moyen" },
    high: { color: "hsl(var(--destructive) / 0.8)", label: "Élevé" },
    critical: { color: "hsl(var(--destructive))", label: "Critique" },
  };

  const statusCfg: Record<string, { color: string; label: string; emoji: string }> = {
    upcoming: { color: "hsl(var(--info))", label: "Planifié", emoji: "📅" },
    overdue: { color: "hsl(var(--destructive))", label: "En retard", emoji: "🔴" },
    in_progress: { color: "hsl(var(--warning))", label: "En cours", emoji: "🔧" },
    completed: { color: "hsl(var(--success))", label: "Terminé", emoji: "✅" },
  };

  const reminders = useMemo(() => {
    const now = new Date();
    return upcoming.map(t => {
      const date = new Date(t.scheduledDate);
      const daysUntil = Math.ceil((date.getTime() - now.getTime()) / 86400000);
      return { ...t, daysUntil };
    }).filter(t => t.daysUntil <= 14);
  }, [upcoming]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Planification Maintenance</h3>
        {overdueCount > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
            🔴 {overdueCount} en retard
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "À venir", value: upcoming.length, color: "--info" },
          { label: "En retard", value: overdueCount, color: "--destructive" },
          { label: "Terminés", value: history.length, color: "--success" },
          { label: "Coût total", value: `${totalCostHistory}€`, color: "--warning" },
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
          { id: "upcoming" as const, label: `📅 À venir (${upcoming.length})` },
          { id: "history" as const, label: "📋 Historique" },
          { id: "reminders" as const, label: `🔔 Rappels (${reminders.length})` },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--warning) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "upcoming" && (
          <motion.div key="upcoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Button size="sm" className="w-full text-xs h-8" style={{ background: "hsl(var(--warning) / 0.12)", color: "hsl(var(--warning))" }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Planifier un entretien
            </Button>
            {upcoming.map(t => {
              const type = typeCfg[t.type];
              const prio = priorityCfg[t.priority];
              const st = statusCfg[t.status];
              return (
                <div key={t.id} className="rounded-xl p-3 space-y-1.5" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${st.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{type.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{t.description}</p>
                      <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{t.vehiclePlate} • {t.vehicleModel}</p>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${st.color}12`, color: st.color }}>
                      {st.emoji} {st.label}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                    <span>📅 {t.scheduledDate}</span>
                    <span style={{ color: prio.color }}>⚡ {prio.label}</span>
                    <span>🔄 Tous les {t.intervalMonths} mois</span>
                    {t.mileageTrigger && <span>📏 {t.mileageTrigger.toLocaleString()} km</span>}
                  </div>
                  {t.technician && <p className="text-[8px]" style={{ color: "hsl(var(--info) / 0.6)" }}>🔧 {t.technician}</p>}
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
            {history.map(t => {
              const type = typeCfg[t.type];
              return (
                <div key={t.id} className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <span className="text-sm">{type.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{t.description}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{t.vehiclePlate} • {t.completedDate}</p>
                  </div>
                  {t.cost && <span className="text-[10px] font-bold shrink-0" style={{ color: "hsl(var(--warning))" }}>{t.cost}€</span>}
                  <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--success))" }} />
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "reminders" && (
          <motion.div key="reminders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {reminders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[10px]" style={{ color: "hsl(var(--success))" }}>✅ Aucun rappel imminent</p>
              </div>
            ) : reminders.map(t => {
              const type = typeCfg[t.type];
              const isOverdue = t.daysUntil < 0;
              const isUrgent = t.daysUntil <= 3;
              const color = isOverdue ? "hsl(var(--destructive))" : isUrgent ? "hsl(var(--warning))" : "hsl(var(--info))";
              return (
                <div key={t.id} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: `${color}06`, border: `1px solid ${color}15` }}>
                  <Bell className="h-4 w-4 shrink-0" style={{ color }} />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{type.emoji} {t.description}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{t.vehiclePlate} • {t.scheduledDate}</p>
                  </div>
                  <span className="text-[9px] font-bold shrink-0" style={{ color }}>
                    {isOverdue ? `${Math.abs(t.daysUntil)}j en retard` : t.daysUntil === 0 ? "Aujourd'hui" : `Dans ${t.daysUntil}j`}
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
