/**
 * DeliverySchedulingCalendar — EEE. Delivery Scheduling Calendar
 * Interactive calendar with day/week/month views and job visualization.
 * PASS91-EEE
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Clock, Package, Truck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

type CalendarView = "day" | "week" | "month";

interface CalendarJob {
  id: string;
  time: string;
  duration: number;
  title: string;
  status: "pending" | "assigned" | "in_progress" | "completed";
  driver?: string;
  pickup: string;
  dropoff: string;
  priority: "standard" | "express" | "urgent";
}

const MOCK_JOBS: CalendarJob[] = [
  { id: "j1", time: "08:30", duration: 45, title: "Colis électronique", status: "completed", driver: "Mohamed K.", pickup: "Entrepôt A", dropoff: "12 Rue Victor Hugo", priority: "standard" },
  { id: "j2", time: "09:15", duration: 30, title: "Documents urgents", status: "in_progress", driver: "Sophie L.", pickup: "Bureau central", dropoff: "45 Av. Foch", priority: "urgent" },
  { id: "j3", time: "10:00", duration: 60, title: "Meubles (fragile)", status: "assigned", driver: "Ali B.", pickup: "Magasin déco", dropoff: "8 Pl. de la République", priority: "express" },
  { id: "j4", time: "11:30", duration: 30, title: "Commande alimentaire", status: "pending", pickup: "Restaurant Le Bon", dropoff: "22 Rue de la Paix", priority: "express" },
  { id: "j5", time: "14:00", duration: 45, title: "Colis mode", status: "pending", pickup: "Boutique Mode", dropoff: "15 Bd Haussmann", priority: "standard" },
  { id: "j6", time: "15:30", duration: 30, title: "Pharmacie express", status: "assigned", driver: "Lucas M.", pickup: "Pharmacie Centrale", dropoff: "3 Rue Pasteur", priority: "urgent" },
  { id: "j7", time: "17:00", duration: 60, title: "Livraison B2B", status: "pending", pickup: "Entrepôt B", dropoff: "Zone Industrielle Nord", priority: "standard" },
];

const PRIORITY_CFG: Record<string, { color: string; label: string }> = {
  standard: { color: "hsl(var(--success))", label: "🟢" },
  express: { color: "hsl(var(--warning))", label: "🟠" },
  urgent: { color: "hsl(var(--destructive))", label: "🔴" },
};

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  pending: { color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.08)" },
  assigned: { color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.08)" },
  in_progress: { color: "hsl(var(--hud-cyan))", bg: "hsl(var(--hud-cyan) / 0.08)" },
  completed: { color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.08)" },
};

export default function DeliverySchedulingCalendar({ orgId }: { orgId: string }) {
  const [view, setView] = useState<CalendarView>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 - 18:00

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    return Array.from({ length: 42 }, (_, i) => {
      const day = i - offset + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [currentDate]);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const dateStr = currentDate.toLocaleDateString("fr-FR", {
    ...(view === "day" ? { weekday: "long", day: "numeric", month: "long" } : {}),
    ...(view === "week" ? { day: "numeric", month: "short" } : {}),
    ...(view === "month" ? { month: "long", year: "numeric" } : {}),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Planning Livraisons</h3>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate(-1)}
          style={{ color: "hsl(var(--hud-text-dim))" }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-[11px] font-bold capitalize" style={{ color: "hsl(var(--hud-text))" }}>{dateStr}</p>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate(1)}
          style={{ color: "hsl(var(--hud-text-dim))" }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* View selector */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "day" as const, label: "Jour" },
          { id: "week" as const, label: "Semaine" },
          { id: "month" as const, label: "Mois" },
        ]).map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: view === v.id ? "hsl(var(--info) / 0.12)" : "transparent",
              color: view === v.id ? "hsl(var(--info))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Day view */}
      {view === "day" && (
        <div className="space-y-1">
          {hours.map(h => {
            const hourJobs = MOCK_JOBS.filter(j => parseInt(j.time) === h);
            return (
              <div key={h} className="flex gap-2 min-h-[44px]">
                <span className="text-[9px] font-mono w-10 shrink-0 pt-1 text-right" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {String(h).padStart(2, "0")}:00
                </span>
                <div className="flex-1 border-t pt-1 space-y-1" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                  {hourJobs.map(job => {
                    const sCfg = STATUS_CFG[job.status];
                    return (
                      <motion.div key={job.id} layout
                        onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                        className="rounded-lg px-2.5 py-1.5 cursor-pointer"
                        style={{ background: sCfg.bg, borderLeft: `3px solid ${sCfg.color}` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px]">{PRIORITY_CFG[job.priority].label}</span>
                          <p className="text-[10px] font-semibold flex-1 truncate" style={{ color: "hsl(var(--hud-text))" }}>{job.title}</p>
                          <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{job.time} • {job.duration}min</span>
                        </div>
                        {selectedJob === job.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-1.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                              <MapPin className="h-2.5 w-2.5" /> {job.pickup} → {job.dropoff}
                            </div>
                            {job.driver && (
                              <div className="flex items-center gap-1.5 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                                <Truck className="h-2.5 w-2.5" /> {job.driver}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Week view */}
      {view === "week" && (
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
              <p key={d} className="text-[8px] text-center font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              const jobCount = Math.floor(Math.random() * 4);
              return (
                <div key={i} className="rounded-lg p-1.5 text-center min-h-[60px]"
                  style={{
                    background: isToday ? "hsl(var(--info) / 0.08)" : "hsl(var(--hud-surface))",
                    border: `1px solid ${isToday ? "hsl(var(--info) / 0.2)" : "hsl(var(--hud-border) / 0.06)"}`,
                  }}>
                  <p className="text-[10px] font-bold" style={{ color: isToday ? "hsl(var(--info))" : "hsl(var(--hud-text))" }}>
                    {d.getDate()}
                  </p>
                  {jobCount > 0 && (
                    <div className="flex justify-center gap-0.5 mt-1 flex-wrap">
                      {Array.from({ length: Math.min(jobCount, 3) }).map((_, j) => (
                        <div key={j} className="w-1.5 h-1.5 rounded-full" style={{
                          background: ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--hud-cyan))"][j % 3],
                        }} />
                      ))}
                    </div>
                  )}
                  {jobCount > 0 && (
                    <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{jobCount} jobs</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month view */}
      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <p key={i} className="text-[8px] text-center font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {monthDays.map((day, i) => {
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
              return (
                <div key={i} className="rounded-md p-1 text-center min-h-[28px] flex items-center justify-center"
                  style={{
                    background: day ? (isToday ? "hsl(var(--info) / 0.12)" : "hsl(var(--hud-surface))") : "transparent",
                  }}>
                  {day && (
                    <p className="text-[9px] font-semibold" style={{ color: isToday ? "hsl(var(--info))" : "hsl(var(--hud-text) / 0.7)" }}>{day}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text))" }}>📊 Résumé du jour</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: MOCK_JOBS.length, color: "--hud-cyan" },
            { label: "En attente", value: MOCK_JOBS.filter(j => j.status === "pending").length, color: "--warning" },
            { label: "En cours", value: MOCK_JOBS.filter(j => j.status === "in_progress").length, color: "--info" },
            { label: "Terminées", value: MOCK_JOBS.filter(j => j.status === "completed").length, color: "--success" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
