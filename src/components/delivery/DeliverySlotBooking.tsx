/**
 * DeliverySlotBooking — Time slot booking for deliveries.
 * Calendar, time windows, capacity management.
 * PASS88-TT: Delivery Slot Booking
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle2, Users, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  capacity: number;
  booked: number;
  price: number;
  available: boolean;
}

interface SlotConfig {
  slotsPerDay: number;
  startHour: number;
  endHour: number;
  slotDurationMin: number;
  maxCapacityPerSlot: number;
  expressSlots: boolean;
  sundayEnabled: boolean;
}

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const generateSlots = (date: Date, config: SlotConfig): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const isToday = date.toDateString() === new Date().toDateString();
  const currentHour = new Date().getHours();
  
  for (let h = config.startHour; h < config.endHour; h += config.slotDurationMin / 60) {
    const startH = Math.floor(h);
    const startM = Math.round((h - startH) * 60);
    const endH = Math.floor(h + config.slotDurationMin / 60);
    const endM = Math.round(((h + config.slotDurationMin / 60) - endH) * 60);
    const booked = Math.floor(Math.random() * (config.maxCapacityPerSlot + 1));
    const isPast = isToday && startH <= currentHour;

    slots.push({
      id: `${date.toISOString().split("T")[0]}-${String(startH).padStart(2, "0")}${String(startM).padStart(2, "0")}`,
      start: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
      end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      capacity: config.maxCapacityPerSlot,
      booked,
      price: startH >= 18 || startH < 9 ? 12 : startH >= 12 && startH < 14 ? 8 : 10,
      available: !isPast && booked < config.maxCapacityPerSlot,
    });
  }
  return slots;
};

export default function DeliverySlotBooking({ orgId }: { orgId: string }) {
  const [config, setConfig] = useState<SlotConfig>({
    slotsPerDay: 8, startHour: 8, endHour: 20, slotDurationMin: 90,
    maxCapacityPerSlot: 5, expressSlots: true, sundayEnabled: false,
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDates = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const slots = useMemo(() => generateSlots(selectedDate, config), [selectedDate, config]);
  const isWeekend = selectedDate.getDay() === 0;
  const isSunday = selectedDate.getDay() === 0 && !config.sundayEnabled;

  const bookSlot = (slotId: string) => {
    haptic("medium");
    setSelectedSlot(slotId);
    toast.success("Créneau réservé !");
  };

  const totalCapacity = slots.reduce((s, sl) => s + sl.capacity, 0);
  const totalBooked = slots.reduce((s, sl) => s + sl.booked, 0);
  const fillRate = totalCapacity > 0 ? (totalBooked / totalCapacity * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Créneaux de livraison</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowConfig(!showConfig)}>
          <Settings className="w-3 h-3" style={{ color: "hsl(var(--hud-text-dim))" }} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Capacité", value: totalCapacity, color: "--info" },
          { label: "Réservés", value: totalBooked, color: "--hud-cyan" },
          { label: "Remplissage", value: `${fillRate.toFixed(0)}%`, color: fillRate > 80 ? "--destructive" : "--success" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="w-4 h-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
        </Button>
        <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
          {MONTHS_FR[weekDates[0].getMonth()]} {weekDates[0].getFullYear()}
        </span>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w + 1)}>
          <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
        </Button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map(d => {
          const isSelected = d.toDateString() === selectedDate.toDateString();
          const isToday = d.toDateString() === new Date().toDateString();
          const isPast = d < new Date(new Date().toDateString());
          return (
            <button key={d.toISOString()} onClick={() => !isPast && setSelectedDate(d)} disabled={isPast}
              className="rounded-lg py-2 text-center transition-all"
              style={{
                background: isSelected ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface))",
                border: `1px solid ${isSelected ? "hsl(var(--hud-cyan) / 0.3)" : isToday ? "hsl(var(--primary) / 0.2)" : "hsl(var(--hud-border) / 0.06)"}`,
                opacity: isPast ? 0.3 : 1,
              }}>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{DAYS_FR[d.getDay()]}</p>
              <p className="text-xs font-bold" style={{ color: isSelected ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text))" }}>{d.getDate()}</p>
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {isSunday ? (
        <div className="text-center py-8">
          <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Dimanche — Pas de livraisons</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {slots.map((slot, i) => {
            const isBooked = selectedSlot === slot.id;
            const fillPct = (slot.booked / slot.capacity) * 100;
            return (
              <motion.div key={slot.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
                style={{
                  background: isBooked ? "hsl(var(--hud-cyan) / 0.06)" : "hsl(var(--hud-surface))",
                  border: `1px solid ${isBooked ? "hsl(var(--hud-cyan) / 0.2)" : !slot.available ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--hud-border) / 0.06)"}`,
                  opacity: slot.available ? 1 : 0.5,
                }}>
                <div className="w-14 text-center shrink-0">
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{slot.start}</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{slot.end}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                      {slot.booked}/{slot.capacity} réservés
                    </span>
                    <span className="text-[9px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{slot.price}€</span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${fillPct}%`,
                      background: fillPct >= 80 ? "hsl(var(--destructive))" : fillPct >= 50 ? "hsl(var(--warning))" : "hsl(var(--success))",
                    }} />
                  </div>
                </div>
                {slot.available && !isBooked ? (
                  <Button size="sm" className="text-[8px] h-6 px-2" onClick={() => bookSlot(slot.id)}
                    style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                    Réserver
                  </Button>
                ) : isBooked ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
                ) : (
                  <span className="text-[8px] shrink-0" style={{ color: "hsl(var(--destructive))" }}>Complet</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Config panel */}
      {showConfig && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Configuration</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Heure début", key: "startHour" as const, type: "number" },
              { label: "Heure fin", key: "endHour" as const, type: "number" },
              { label: "Durée (min)", key: "slotDurationMin" as const, type: "number" },
              { label: "Capacité/créneau", key: "maxCapacityPerSlot" as const, type: "number" },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{f.label}</Label>
                <Input type="number" value={config[f.key]}
                  onChange={e => setConfig(c => ({ ...c, [f.key]: +e.target.value }))}
                  className="h-7 text-[10px]" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.sundayEnabled} onChange={e => setConfig(c => ({ ...c, sundayEnabled: e.target.checked }))} />
            <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Dimanche activé</span>
          </label>
        </motion.div>
      )}
    </div>
  );
}
