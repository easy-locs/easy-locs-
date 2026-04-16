/**
 * MaintenanceScheduler — RRR. Maintenance Scheduler
 * Preventive maintenance planning with automatic reminders and full history.
 * PASS94-RRR
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Calendar, Bell, CheckCircle2, Clock, AlertTriangle, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveryJobs } from "@/hooks/useDeliveryData";

export default function MaintenanceScheduler({ orgId }: { orgId: string }) {
  const { data: allJobs = [], isLoading } = useDeliveryJobs(orgId);
  const [tab, setTab] = useState<"upcoming" | "history" | "reminders">("upcoming");

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const tasks = allJobs as any[];

  const upcoming = tasks.filter((t: any) => ["upcoming", "overdue", "in_progress", "scheduled"].includes(t.status))
    .sort((a: any, b: any) => new Date(a.scheduled_date || a.scheduledDate || a.created_at).getTime() - new Date(b.scheduled_date || b.scheduledDate || b.created_at).getTime());
  const history = tasks.filter((t: any) => t.status === "completed")
    .sort((a: any, b: any) => new Date(b.completed_date || b.completedDate || b.created_at).getTime() - new Date(a.completed_date || a.completedDate || a.created_at).getTime());

  const totalCostHistory = history.reduce((s: number, t: any) => s + (t.cost || 0), 0);
  const overdueCount = upcoming.filter((t: any) => t.status === "overdue").length;

  const typeCfg: Record<string, { emoji: string; label: string }> = {
    oil_change: { emoji: "🛢️", label: "Vidange" },
    tires: { emoji: "🔘", label: "Pneus" },
    brakes: { emoji: "🛑", label: "Freins" },
    inspection: { emoji: "🔍", label: "Contrôle" },
    battery: { emoji: "🔋", label: "Batterie" },
    filters: { emoji: "🌬️", label: "Filtres" },
    timing_belt: { emoji: "⚙️", label: "Courroie" },
    general: { emoji: "🔧", label: "Révision" },
    maintenance: { emoji: "🔧", label: "Maintenance" },
  };

  const priorityCfg: Record<string, { color: string; label: string }> = {
    low: { color: "hsl(var(--info))", label: "Faible" },
    medium: { color: "hsl(var(--warning))", label: "Moyen" },
    high: { color: "hsl(var(--destructive) / 0.8)", label: "Élevé" },
    critical: { color: "hsl(var(--destructive))", label: "Critique" },
  };

  const statusCfg: Record<string, { color: string; label: string; emoji: string }> = {
    upcoming: { color: "hsl(var(--info))", label: "Planifié", emoji: "📅" },
    scheduled: { color: "hsl(var(--info))", label: "Planifié", emoji: "📅" },
    overdue: { color: "hsl(var(--destructive))", label: "En retard", emoji: "🔴" },
    in_progress: { color: "hsl(var(--warning))", label: "En cours", emoji: "🔧" },
    completed: { color: "hsl(var(--success))", label: "Terminé", emoji: "✅" },
  };

  const reminders = useMemo(() => {
    const now = new Date();
    return upcoming.map((t: any) => {
      const date = new Date(t.scheduled_date || t.scheduledDate || t.created_at);
      const daysUntil = Math.ceil((date.getTime() - now.getTime()) / 86400000);
      return { ...t, daysUntil };
    }).filter((t: any) => t.daysUntil <= 14);
  }, [upcoming]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Planification Maintenance</h3>
        {overdueCount > 0 && (
          <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
            🔴 {overdueCount} en retard
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "À venir", value: upcoming.length, color: "--info" },
          { label: "En retard", value: overdueCount, color: "--destructive" },
          { label: "Terminés", value: history.length, color: "--success" },
          { label: "Coût total", value: `${totalCostHistory}€`, color: "--warning" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[0.625rem] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
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
            className="flex-1 py-1.5 px-2 rounded-md text-[0.625rem] font-semibold transition-all"
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
            {upcoming.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun entretien à venir</div>
            )}
            {upcoming.map((t: any) => {
              const type = typeCfg[t.type] || typeCfg.general;
              const prio = priorityCfg[t.priority] || priorityCfg.medium;
              const st = statusCfg[t.status] || statusCfg.upcoming;
              const scheduledDate = t.scheduled_date || t.scheduledDate || t.created_at || "";
              const vehiclePlate = t.vehicle_plate || t.vehiclePlate || "";
              const vehicleModel = t.vehicle_model || t.vehicleModel || "";
              const intervalMonths = t.interval_months || t.intervalMonths || 0;
              const mileageTrigger = t.mileage_trigger || t.mileageTrigger;
              return (
                <div key={t.id} className="rounded-xl p-3 space-y-1.5" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${st.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{type.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{t.description || t.title || type.label}</p>
                      <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{vehiclePlate} • {vehicleModel}</p>
                    </div>
                    <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${st.color}12`, color: st.color }}>
                      {st.emoji} {st.label}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                    <span>📅 {scheduledDate}</span>
                    <span style={{ color: prio.color }}>⚡ {prio.label}</span>
                    {intervalMonths > 0 && <span>🔄 Tous les {intervalMonths} mois</span>}
                    {mileageTrigger && <span>📏 {Number(mileageTrigger).toLocaleString()} km</span>}
                  </div>
                  {t.technician && <p className="text-[0.625rem]" style={{ color: "hsl(var(--info) / 0.6)" }}>🔧 {t.technician}</p>}
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
            {history.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun historique</div>
            )}
            {history.map((t: any) => {
              const type = typeCfg[t.type] || typeCfg.general;
              const completedDate = t.completed_date || t.completedDate || t.created_at || "";
              return (
                <div key={t.id} className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <span className="text-sm">{type.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.625rem] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{t.description || t.title || type.label}</p>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{t.vehicle_plate || t.vehiclePlate || ""} • {completedDate}</p>
                  </div>
                  {t.cost && <span className="text-[0.625rem] font-bold shrink-0" style={{ color: "hsl(var(--warning))" }}>{t.cost}€</span>}
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
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--success))" }}>✅ Aucun rappel imminent</p>
              </div>
            ) : reminders.map((t: any) => {
              const type = typeCfg[t.type] || typeCfg.general;
              const isOverdue = t.daysUntil < 0;
              const isUrgent = t.daysUntil <= 3;
              const color = isOverdue ? "hsl(var(--destructive))" : isUrgent ? "hsl(var(--warning))" : "hsl(var(--info))";
              const scheduledDate = t.scheduled_date || t.scheduledDate || t.created_at || "";
              return (
                <div key={t.id} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: `color-mix(in srgb, ${color} 3%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 8%, transparent)` }}>
                  <Bell className="h-4 w-4 shrink-0" style={{ color }} />
                  <div className="flex-1">
                    <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{type.emoji} {t.description || t.title || type.label}</p>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{t.vehicle_plate || t.vehiclePlate || ""} • {scheduledDate}</p>
                  </div>
                  <span className="text-[0.625rem] font-bold shrink-0" style={{ color }}>
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
