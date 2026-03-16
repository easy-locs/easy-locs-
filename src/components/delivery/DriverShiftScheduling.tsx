/**
 * DriverShiftScheduling — Shift planning with calendar, availability, and auto-rotation.
 * PASS86-JJ: Driver Shift Scheduling
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Users, Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Shift {
  id: string;
  driverName: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  zone: string;
  status: "scheduled" | "active" | "completed" | "missed";
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const ZONES = ["Centre-ville", "Gare", "Nord", "Sud", "Est", "Ouest"];

export default function DriverShiftScheduling({ orgId }: { orgId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([
    { id: "s1", driverName: "Ali M.", driverId: "d1", date: getDateStr(0), startTime: "08:00", endTime: "12:00", zone: "Centre-ville", status: "scheduled" },
    { id: "s2", driverName: "Fatou K.", driverId: "d2", date: getDateStr(0), startTime: "12:00", endTime: "18:00", zone: "Gare", status: "active" },
    { id: "s3", driverName: "Ali M.", driverId: "d1", date: getDateStr(1), startTime: "14:00", endTime: "20:00", zone: "Nord", status: "scheduled" },
    { id: "s4", driverName: "Omar S.", driverId: "d3", date: getDateStr(2), startTime: "08:00", endTime: "16:00", zone: "Sud", status: "scheduled" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newShift, setNewShift] = useState({ driverName: "", date: "", startTime: "08:00", endTime: "16:00", zone: "Centre-ville" });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function getDateStr(dayOffset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d.toISOString().slice(0, 10);
  }

  const weekDates = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekOffset]);

  const addShift = () => {
    if (!newShift.driverName || !newShift.date) { toast.error("Champs requis"); return; }
    setShifts(prev => [...prev, {
      id: crypto.randomUUID(),
      driverName: newShift.driverName,
      driverId: crypto.randomUUID().slice(0, 8),
      date: newShift.date,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      zone: newShift.zone,
      status: "scheduled",
    }]);
    setShowAdd(false);
    setNewShift({ driverName: "", date: "", startTime: "08:00", endTime: "16:00", zone: "Centre-ville" });
    toast.success("Shift ajouté");
  };

  const deleteShift = (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    toast("Shift supprimé");
  };

  const autoRotate = () => {
    const drivers = [...new Set(shifts.map(s => s.driverName))];
    if (drivers.length < 2) { toast.error("Minimum 2 chauffeurs requis"); return; }
    const nextWeek = weekDates.map((date, i) => ({
      id: crypto.randomUUID(),
      driverName: drivers[i % drivers.length],
      driverId: `auto-${i}`,
      date,
      startTime: "08:00",
      endTime: "18:00",
      zone: ZONES[i % ZONES.length],
      status: "scheduled" as const,
    }));
    setShifts(prev => [...prev, ...nextWeek]);
    toast.success(`${nextWeek.length} shifts auto-générés`);
  };

  const getStatusConfig = (s: string) => {
    switch (s) {
      case "active": return { color: "hsl(var(--success))", label: "Actif" };
      case "completed": return { color: "hsl(var(--hud-cyan))", label: "Terminé" };
      case "missed": return { color: "hsl(var(--destructive))", label: "Manqué" };
      default: return { color: "hsl(var(--hud-text-dim) / 0.5)", label: "Planifié" };
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekLabel = `${new Date(weekDates[0]).toLocaleDateString("fr", { day: "numeric", month: "short" })} — ${new Date(weekDates[6]).toLocaleDateString("fr", { day: "numeric", month: "short" })}`;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Calendar className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
          Planning shifts
        </h3>
        <div className="flex gap-1">
          <Button size="sm" className="text-[10px] h-7 px-2" onClick={autoRotate}
            style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
            🔄 Auto-rotation
          </Button>
          <Button size="sm" className="text-[10px] h-7 px-2" onClick={() => setShowAdd(!showAdd)}
            style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between px-1">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }} />
        </Button>
        <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{weekLabel}</span>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w + 1)}>
          <ChevronRight className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }} />
        </Button>
      </div>

      {/* Week calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, i) => {
          const dayShifts = shifts.filter(s => s.date === date);
          const isToday = date === todayStr;
          const isSelected = selectedDay === date;

          return (
            <button key={date} onClick={() => setSelectedDay(isSelected ? null : date)}
              className="rounded-lg py-1.5 text-center transition-all"
              style={{
                background: isSelected ? "hsl(var(--hud-cyan) / 0.1)" : isToday ? "hsl(var(--hud-cyan) / 0.05)" : "hsl(var(--hud-surface))",
                border: `1px solid ${isSelected ? "hsl(var(--hud-cyan) / 0.3)" : isToday ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)"}`,
              }}>
              <p className="text-[8px] font-semibold" style={{ color: isToday ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)" }}>
                {DAYS_FR[i]}
              </p>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                {new Date(date).getDate()}
              </p>
              {dayShifts.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayShifts.slice(0, 3).map(s => (
                    <div key={s.id} className="w-1.5 h-1.5 rounded-full" style={{ background: getStatusConfig(s.status).color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Add shift form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-cyan) / 0.15)" }}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Chauffeur</Label>
                  <Input value={newShift.driverName} onChange={e => setNewShift(p => ({ ...p, driverName: e.target.value }))}
                    placeholder="Nom" className="h-7 text-[9px] mt-0.5"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Date</Label>
                  <Input type="date" value={newShift.date} onChange={e => setNewShift(p => ({ ...p, date: e.target.value }))}
                    className="h-7 text-[9px] mt-0.5"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Début</Label>
                  <Input type="time" value={newShift.startTime} onChange={e => setNewShift(p => ({ ...p, startTime: e.target.value }))}
                    className="h-7 text-[9px] mt-0.5"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Fin</Label>
                  <Input type="time" value={newShift.endTime} onChange={e => setNewShift(p => ({ ...p, endTime: e.target.value }))}
                    className="h-7 text-[9px] mt-0.5"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Zone</Label>
                  <select value={newShift.zone} onChange={e => setNewShift(p => ({ ...p, zone: e.target.value }))}
                    className="w-full h-7 text-[9px] mt-0.5 rounded-md px-1"
                    style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }}>
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <Button size="sm" className="w-full text-[10px] h-7" onClick={addShift}
                style={{ background: "hsl(var(--success))", color: "#fff" }}>Ajouter le shift</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day shifts detail */}
      {selectedDay && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text-dim))" }}>
            {new Date(selectedDay).toLocaleDateString("fr", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {shifts.filter(s => s.date === selectedDay).length === 0 ? (
            <p className="text-[9px] text-center py-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucun shift ce jour</p>
          ) : (
            shifts.filter(s => s.date === selectedDay).map(shift => {
              const cfg = getStatusConfig(shift.status);
              return (
                <div key={shift.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <div className="w-2 h-8 rounded-full" style={{ background: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{shift.driverName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                        <Clock className="h-2.5 w-2.5 inline mr-0.5" />{shift.startTime}–{shift.endTime}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded"
                        style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                        📍 {shift.zone}
                      </span>
                    </div>
                  </div>
                  <span className="text-[8px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteShift(shift.id)}>
                    <Trash2 className="h-3 w-3" style={{ color: "hsl(var(--destructive) / 0.5)" }} />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Shifts semaine", value: shifts.filter(s => weekDates.includes(s.date)).length, color: "--hud-cyan" },
          { label: "Chauffeurs", value: new Set(shifts.map(s => s.driverName)).size, color: "--info" },
          { label: "Heures planifiées", value: shifts.filter(s => weekDates.includes(s.date)).reduce((sum, s) => {
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            return sum + (eh + em / 60) - (sh + sm / 60);
          }, 0).toFixed(0) + "h", color: "--success" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-2 py-1.5 text-center"
            style={{ background: `hsl(var(${color}) / 0.05)`, border: `1px solid hsl(var(${color}) / 0.1)` }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
