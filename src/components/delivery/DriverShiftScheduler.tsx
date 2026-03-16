/**
 * DriverShiftScheduler — CCC. Shift calendar for drivers.
 * Available slots, auto-rotation, swap requests, zone coverage.
 * PASS97-CCC
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Clock, MapPin, Users, RefreshCw,
  CheckCircle2, AlertTriangle, ArrowLeftRight, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  driverName: string;
  driverId: string;
  status: "scheduled" | "active" | "completed" | "swap_requested" | "open";
  autoRotation: boolean;
}

interface SwapRequest {
  id: string;
  fromDriver: string;
  toDriver: string;
  shiftId: string;
  date: string;
  status: "pending" | "accepted" | "declined";
}

const ZONES = ["Centre", "Nord", "Sud", "Est", "Ouest"];

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const generateWeekShifts = (): Shift[] => {
  const shifts: Shift[] = [];
  const drivers = ["Mamadou K.", "Fatou D.", "Ibrahima S.", "Aïcha M.", "Omar B."];
  const today = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const slotsPerDay = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < slotsPerDay; s++) {
      const startH = 8 + s * 3;
      const isOpen = Math.random() > 0.7;
      shifts.push({
        id: `s-${d}-${s}`,
        date: dateStr,
        startTime: `${startH}:00`,
        endTime: `${startH + 3}:00`,
        zone: ZONES[Math.floor(Math.random() * ZONES.length)],
        driverName: isOpen ? "" : drivers[Math.floor(Math.random() * drivers.length)],
        driverId: isOpen ? "" : `drv-${Math.floor(Math.random() * 5)}`,
        status: isOpen ? "open" : d === 0 && s === 0 ? "active" : d < 2 ? "scheduled" : "scheduled",
        autoRotation: Math.random() > 0.5,
      });
    }
  }
  return shifts;
};

export default function DriverShiftScheduler({ orgId, className }: { orgId: string; className?: string }) {
  const [shifts, setShifts] = useState<Shift[]>(generateWeekShifts);
  const [swaps] = useState<SwapRequest[]>([
    { id: "sw1", fromDriver: "Mamadou K.", toDriver: "Fatou D.", shiftId: "s-1-0", date: "Demain", status: "pending" },
  ]);
  const [view, setView] = useState<"calendar" | "swaps" | "coverage">("calendar");
  const [selectedDay, setSelectedDay] = useState(0);

  const today = new Date();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayShifts = shifts.filter(s => s.date === weekDates[selectedDay].toISOString().split("T")[0]);

  const totalShifts = shifts.length;
  const openShifts = shifts.filter(s => s.status === "open").length;
  const activeShifts = shifts.filter(s => s.status === "active").length;
  const pendingSwaps = swaps.filter(s => s.status === "pending").length;

  const statusColor = (s: string) =>
    s === "active" ? "hsl(var(--success))" : s === "open" ? "hsl(var(--warning))" :
    s === "swap_requested" ? "hsl(var(--info))" : s === "completed" ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))";

  const claimShift = (shiftId: string) => {
    haptic("success");
    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: "scheduled", driverName: "Vous", driverId: "me" } : s));
    toast.success("✅ Créneau réservé !");
  };

  // Zone coverage calculation
  const zoneCoverage = ZONES.map(zone => {
    const zoneShifts = shifts.filter(s => s.zone === zone);
    const covered = zoneShifts.filter(s => s.status !== "open").length;
    return { zone, total: zoneShifts.length, covered, pct: zoneShifts.length > 0 ? (covered / zoneShifts.length) * 100 : 0 };
  });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Calendar className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Planning des shifts
        </h3>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>
          {openShifts} ouvert{openShifts > 1 ? "s" : ""}
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: totalShifts, color: "--primary" },
          { label: "Ouverts", value: openShifts, color: "--warning" },
          { label: "Actifs", value: activeShifts, color: "--success" },
          { label: "Swaps", value: pendingSwaps, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["calendar", "swaps", "coverage"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "calendar" ? "📅 Calendrier" : v === "swaps" ? `🔄 Swaps (${pendingSwaps})` : "🗺️ Couverture"}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="space-y-3">
          {/* Day selector */}
          <div className="flex gap-1">
            {weekDates.map((d, i) => (
              <button key={i} onClick={() => { setSelectedDay(i); haptic("selection"); }}
                className="flex-1 rounded-lg py-2 text-center transition-all"
                style={{
                  background: selectedDay === i ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.2)",
                  border: `1px solid ${selectedDay === i ? "hsl(var(--primary) / 0.3)" : "transparent"}`,
                }}>
                <p className="text-[9px] font-semibold" style={{ color: selectedDay === i ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                  {DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                </p>
                <p className="text-xs font-bold" style={{ color: selectedDay === i ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
                  {d.getDate()}
                </p>
              </button>
            ))}
          </div>

          {/* Shifts for selected day */}
          <div className="space-y-2">
            {dayShifts.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun créneau ce jour</p>
              </div>
            ) : dayShifts.map(s => (
              <div key={s.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: s.status === "open" ? "hsl(var(--warning) / 0.05)" : "hsl(var(--muted) / 0.2)",
                  border: `1px solid ${statusColor(s.status)}20`,
                }}>
                <div className="text-center shrink-0">
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--primary))" }}>{s.startTime}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{s.endTime}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" style={{ color: statusColor(s.status) }} />
                    <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.zone}</span>
                    {s.autoRotation && <RefreshCw className="h-2.5 w-2.5" style={{ color: "hsl(var(--info))" }} />}
                  </div>
                  <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {s.status === "open" ? "Créneau libre" : s.driverName}
                  </p>
                </div>
                {s.status === "open" ? (
                  <Button size="sm" className="text-[9px] h-6 px-2" onClick={() => claimShift(s.id)}
                    style={{ background: "hsl(var(--success))", color: "#fff" }}>
                    Prendre
                  </Button>
                ) : (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: statusColor(s.status) + "15", color: statusColor(s.status) }}>
                    {s.status === "active" ? "Actif" : s.status === "completed" ? "Terminé" : "Planifié"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swaps View */}
      {view === "swaps" && (
        <div className="space-y-2">
          {swaps.length === 0 ? (
            <div className="text-center py-8">
              <ArrowLeftRight className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune demande de swap</p>
            </div>
          ) : swaps.map(sw => (
            <div key={sw.id} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.1)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{sw.fromDriver}</span>
                <ArrowLeftRight className="h-3 w-3" style={{ color: "hsl(var(--info))" }} />
                <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{sw.toDriver}</span>
              </div>
              <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{sw.date}</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-[9px] h-6"
                  onClick={() => { haptic("success"); toast.success("Swap accepté"); }}
                  style={{ background: "hsl(var(--success))", color: "#fff" }}>Accepter</Button>
                <Button size="sm" variant="outline" className="flex-1 text-[9px] h-6"
                  onClick={() => { haptic("light"); toast("Swap refusé"); }}
                  style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--muted-foreground))" }}>Refuser</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coverage View */}
      {view === "coverage" && (
        <div className="space-y-2">
          {zoneCoverage.map(z => (
            <div key={z.zone} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                  <MapPin className="h-3 w-3 inline mr-1" style={{ color: "hsl(var(--primary))" }} />
                  Zone {z.zone}
                </p>
                <span className="text-[10px] font-bold" style={{ color: z.pct >= 80 ? "hsl(var(--success))" : z.pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
                  {z.pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${z.pct}%` }}
                  style={{ background: z.pct >= 80 ? "hsl(var(--success))" : z.pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }} />
              </div>
              <p className="text-[8px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                {z.covered}/{z.total} créneaux couverts
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
