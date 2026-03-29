import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { format, isBefore, startOfDay, addDays, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface TimeSlot {
  start: string;
  end: string;
}

interface BookedSlot {
  service_date: string;
  service_time: string | null;
  end_time: string | null;
  quantity: number;
  status: string;
}

/** Activity-specific booking rules passed from the service record */
export interface ActivityBookingRules {
  slotInterval?: number;
  durationMinutes?: number;
  maxCapacity?: number | null;
  minNoticeHours?: number;
  maxAdvanceDays?: number;
  availableDays?: number[];
  openHour?: number;
  closeHour?: number;
  mode?: "hourly" | "daily";
}

interface Props {
  serviceId: string;
  timeSlots: TimeSlot[];
  blockedDates: string[];
  maxCapacity?: number | null;
  onSelect: (date: Date, time: string) => void;
  onSelectRange?: (from: Date, to: Date) => void;
  selectedDate?: Date;
  selectedTime?: string;
  rangeMode?: boolean;
  selectedRange?: { from: Date; to: Date } | null;
  rules?: ActivityBookingRules;
  /** Labels for the range calendar */
  checkInLabel?: string;
  checkOutLabel?: string;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
  { start: "17:00", end: "18:00" },
  { start: "18:00", end: "19:00" },
  { start: "19:00", end: "20:00" },
];

function generateSlotsFromRules(rules: ActivityBookingRules): TimeSlot[] {
  const interval = rules.slotInterval || 60;
  const duration = rules.durationMinutes || interval;
  const openHour = rules.openHour ?? 8;
  const closeHour = rules.closeHour ?? 20;
  const slots: TimeSlot[] = [];
  for (let minutes = openHour * 60; minutes + duration <= closeHour * 60; minutes += interval) {
    const startH = String(Math.floor(minutes / 60)).padStart(2, "0");
    const startM = String(minutes % 60).padStart(2, "0");
    const endMin = minutes + duration;
    const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
    const endM = String(endMin % 60).padStart(2, "0");
    slots.push({ start: `${startH}:${startM}`, end: `${endH}:${endM}` });
  }
  return slots;
}

function deduplicateSlots(slots: TimeSlot[]): TimeSlot[] {
  const seen = new Set<string>();
  return slots.filter(s => {
    if (seen.has(s.start)) return false;
    seen.add(s.start);
    return true;
  });
}

const OCCUPYING_STATUSES = new Set(["pending", "awaiting_payment", "paid", "confirmed", "in_progress", "completed"]);
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

// ─── Availability hooks (shared) ───
function useServiceAvailability(serviceId: string) {
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .rpc("get_public_service_availability", { p_service_id: serviceId });
      if (error) {
        console.error("availability load error", error);
        setBookedSlots([]);
      } else {
        setBookedSlots((data as unknown as BookedSlot[] | null) || []);
      }
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`booking-calendar-${serviceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "concierge_orders", filter: `service_id=eq.${serviceId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_bookings", filter: `service_id=eq.${serviceId}` }, () => load())
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [serviceId]);

  return { bookedSlots, loading };
}

function useAvailabilityData(bookedSlots: BookedSlot[], effectiveCapacity: number, slots: TimeSlot[]) {
  return useMemo(() => {
    const countByDate: Record<string, number> = {};
    const timesByDate: Record<string, Set<string>> = {};
    const occupiedDates = new Set<string>();

    for (const b of bookedSlots) {
      if (!b.service_date) continue;
      const isRangeBooking = typeof b.end_time === "string" && DATE_ONLY_PATTERN.test(b.end_time);

      if (isRangeBooking) {
        try {
          const days = eachDayOfInterval({
            start: parseDateOnly(b.service_date),
            end: parseDateOnly(b.end_time as string),
          });
          for (const day of days) {
            const ds = format(day, "yyyy-MM-dd");
            countByDate[ds] = (countByDate[ds] || 0) + 1;
            occupiedDates.add(ds);
          }
        } catch { /* invalid range */ }
        continue;
      }

      const dateStr = b.service_date;
      countByDate[dateStr] = (countByDate[dateStr] || 0) + (b.quantity || 1);
      if (b.service_time) {
        if (!timesByDate[dateStr]) timesByDate[dateStr] = new Set();
        timesByDate[dateStr].add(b.service_time);
      }
    }

    const fullyBooked = new Set<string>();
    for (const [dateStr, count] of Object.entries(countByDate)) {
      if (slots.length > 0 && timesByDate[dateStr]) {
        if (slots.every(slot => timesByDate[dateStr]?.has(slot.start))) fullyBooked.add(dateStr);
      } else if (count >= effectiveCapacity) {
        fullyBooked.add(dateStr);
      }
    }

    return { fullyBookedDates: fullyBooked, bookedTimesByDate: timesByDate, bookingCountByDate: countByDate, occupiedDates };
  }, [bookedSlots, effectiveCapacity, slots]);
}

// ─── Range Calendar (Airbnb-style check-in / check-out) ───
function RangeCalendar({
  serviceId, blockedDates, maxCapacity, onSelectRange, selectedRange,
  rules, checkInLabel = "Check-in", checkOutLabel = "Check-out",
}: {
  serviceId: string;
  blockedDates: string[];
  maxCapacity?: number | null;
  onSelectRange: (from: Date, to: Date) => void;
  selectedRange?: { from: Date; to: Date } | null;
  rules?: ActivityBookingRules;
  checkInLabel?: string;
  checkOutLabel?: string;
}) {
  const { bookedSlots, loading } = useServiceAvailability(serviceId);
  const effectiveCapacity = rules?.maxCapacity ?? maxCapacity ?? 1;
  const { fullyBookedDates, bookingCountByDate, occupiedDates } = useAvailabilityData(bookedSlots, effectiveCapacity, []);
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const today = startOfDay(new Date());

  const minDate = useMemo(() => {
    if (rules?.minNoticeHours) return new Date(Date.now() + rules.minNoticeHours * 3600000);
    return today;
  }, [rules?.minNoticeHours]);

  const maxDate = useMemo(() => {
    if (rules?.maxAdvanceDays) return addDays(today, rules.maxAdvanceDays);
    return undefined;
  }, [rules?.maxAdvanceDays]);

  const availableDaysSet = useMemo(() => {
    if (rules?.availableDays?.length) return new Set(rules.availableDays);
    return null;
  }, [rules?.availableDays]);

  const [range, setRange] = useState<DateRange | undefined>(
    selectedRange ? { from: selectedRange.from, to: selectedRange.to } : undefined
  );

  const isDateBlocked = (d: Date) => {
    const ds = format(d, "yyyy-MM-dd");
    if (isBefore(d, today)) return true;
    if (isBefore(d, startOfDay(minDate))) return true;
    if (maxDate && isBefore(maxDate, d)) return true;
    if (blockedSet.has(ds)) return true;
    if (fullyBookedDates.has(ds)) return true;
    if (availableDaysSet && !availableDaysSet.has(d.getDay())) return true;
    return false;
  };

  const handleRangeSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);
    if (newRange?.from && newRange?.to) {
      onSelectRange(newRange.from, newRange.to);
    }
  };

  const rangeDays = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Check-in / Check-out display — aligned row */}
      <div className="grid grid-cols-2 gap-3">
        <div className={cn(
          "rounded-xl border-2 px-4 py-3 text-center transition-all",
          !range?.from ? "border-primary bg-primary/5 shadow-sm" : "border-border"
        )}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{checkInLabel}</p>
          <p className={cn("text-sm font-bold", range?.from ? "text-foreground" : "text-muted-foreground/60")}>
            {range?.from ? format(range.from, "dd MMM yyyy") : "—"}
          </p>
        </div>
        <div className={cn(
          "rounded-xl border-2 px-4 py-3 text-center transition-all",
          range?.from && !range?.to ? "border-primary bg-primary/5 shadow-sm" : "border-border"
        )}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{checkOutLabel}</p>
          <p className={cn("text-sm font-bold", range?.to ? "text-foreground" : "text-muted-foreground/60")}>
            {range?.to ? format(range.to, "dd MMM yyyy") : "—"}
          </p>
        </div>
      </div>

      {rangeDays > 0 && (
        <div className="text-center">
          <Badge variant="secondary" className="text-xs px-3 py-1">
            {rangeDays} {rangeDays === 1 ? "night" : "nights"}
          </Badge>
        </div>
      )}

      {/* Calendar — centered, full width */}
      <div className="flex justify-center [&_.rdp]:w-full">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleRangeSelect}
          disabled={isDateBlocked}
          numberOfMonths={1}
          className={cn("rounded-xl border border-border pointer-events-auto w-full")}
          modifiers={{
            booked: (d) => fullyBookedDates.has(format(d, "yyyy-MM-dd")),
            occupied: (d) => {
              const ds = format(d, "yyyy-MM-dd");
              return occupiedDates.has(ds) && !fullyBookedDates.has(ds);
            },
            unavailableDay: (d) => availableDaysSet ? !availableDaysSet.has(d.getDay()) : false,
          }}
          modifiersClassNames={{
            booked: "bg-destructive/20 text-destructive line-through",
            occupied: "bg-warning/20 text-warning-foreground",
            unavailableDay: "opacity-30",
          }}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading availability...
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary/30" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-warning/30" /> Partially booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-destructive/30 line-through" /> Unavailable
        </span>
      </div>
    </div>
  );
}

// ─── Single-date / Slot Calendar ───
function SlotCalendar({
  serviceId, timeSlots, blockedDates, maxCapacity, onSelect, selectedDate, selectedTime, rules,
}: {
  serviceId: string;
  timeSlots: TimeSlot[];
  blockedDates: string[];
  maxCapacity?: number | null;
  onSelect: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
  rules?: ActivityBookingRules;
}) {
  const { bookedSlots, loading } = useServiceAvailability(serviceId);
  const effectiveCapacity = rules?.maxCapacity ?? maxCapacity ?? 1;

  const slots = useMemo(() => {
    if (timeSlots.length > 0) return deduplicateSlots(timeSlots);
    if (rules?.slotInterval || rules?.openHour !== undefined) return deduplicateSlots(generateSlotsFromRules(rules));
    return deduplicateSlots(DEFAULT_SLOTS);
  }, [timeSlots, rules]);

  const { fullyBookedDates, bookedTimesByDate, bookingCountByDate } = useAvailabilityData(bookedSlots, effectiveCapacity, slots);

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const today = startOfDay(new Date());

  const minDate = useMemo(() => {
    if (rules?.minNoticeHours) return new Date(Date.now() + rules.minNoticeHours * 3600000);
    return today;
  }, [rules?.minNoticeHours]);

  const maxDate = useMemo(() => {
    if (rules?.maxAdvanceDays) return addDays(today, rules.maxAdvanceDays);
    return undefined;
  }, [rules?.maxAdvanceDays]);

  const availableDaysSet = useMemo(() => {
    if (rules?.availableDays?.length) return new Set(rules.availableDays);
    return null;
  }, [rules?.availableDays]);

  const [date, setDate] = useState<Date | undefined>(selectedDate);

  const isDateBlocked = (d: Date) => {
    const ds = format(d, "yyyy-MM-dd");
    if (isBefore(d, today)) return true;
    if (isBefore(d, startOfDay(minDate))) return true;
    if (maxDate && isBefore(maxDate, d)) return true;
    if (blockedSet.has(ds)) return true;
    if (fullyBookedDates.has(ds)) return true;
    if (availableDaysSet && !availableDaysSet.has(d.getDay())) return true;
    return false;
  };

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const bookedTimesForDate = bookedTimesByDate[selectedDateStr] || new Set<string>();
  const dateBookingCount = bookingCountByDate[selectedDateStr] || 0;
  const remainingCapacity = effectiveCapacity - dateBookingCount;

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              setDate(d);
              onSelect(d, selectedTime || "");
            }
          }}
          disabled={isDateBlocked}
          className={cn("rounded-xl border border-border pointer-events-auto")}
          modifiers={{
            booked: (d) => fullyBookedDates.has(format(d, "yyyy-MM-dd")),
            partial: (d) => {
              const ds = format(d, "yyyy-MM-dd");
              return !fullyBookedDates.has(ds) && (bookingCountByDate[ds] || 0) > 0;
            },
            unavailableDay: (d) => availableDaysSet ? !availableDaysSet.has(d.getDay()) : false,
          }}
          modifiersClassNames={{
            booked: "bg-destructive/20 text-destructive line-through",
            partial: "bg-warning/15 text-warning",
            unavailableDay: "opacity-30",
          }}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading availability...
        </div>
      )}

      {date && !loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Available times — {format(date, "dd/MM/yyyy")}
            </p>
            {effectiveCapacity > 1 && (
              <Badge variant="outline" className="text-[10px]">
                {remainingCapacity > 0 ? `${remainingCapacity} spots left` : "Fully booked"}
              </Badge>
            )}
          </div>

          {rules?.durationMinutes && (
            <Badge variant="secondary" className="text-[10px]">
              ⏱ {rules.durationMinutes} min per slot
            </Badge>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isBooked = bookedTimesForDate.has(slot.start);
              const slotDateTime = date ? new Date(date) : new Date();
              const [slotH, slotM] = slot.start.split(":").map(Number);
              slotDateTime.setHours(slotH, slotM, 0, 0);
              const isTooSoon = isBefore(slotDateTime, minDate);

              return (
                <Button
                  key={slot.start}
                  variant={selectedTime === slot.start ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "text-xs",
                    (isBooked || isTooSoon) && "opacity-40 line-through cursor-not-allowed"
                  )}
                  disabled={isBooked || isTooSoon}
                  onClick={() => onSelect(date!, slot.start)}
                >
                  {slot.start}
                  {isBooked && <span className="ml-1 text-[9px]">✕</span>}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent" /> Selected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-warning/30" /> Partial
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-destructive/30 line-through" /> Full
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component (delegates to range or slot) ───
const ServiceBookingCalendar = ({
  serviceId, timeSlots, blockedDates, maxCapacity,
  onSelect, onSelectRange, selectedDate, selectedTime,
  rangeMode = false, selectedRange, rules,
  checkInLabel, checkOutLabel,
}: Props) => {
  if (rangeMode && onSelectRange) {
    return (
      <RangeCalendar
        serviceId={serviceId}
        blockedDates={blockedDates}
        maxCapacity={maxCapacity}
        onSelectRange={onSelectRange}
        selectedRange={selectedRange}
        rules={rules}
        checkInLabel={checkInLabel}
        checkOutLabel={checkOutLabel}
      />
    );
  }

  return (
    <SlotCalendar
      serviceId={serviceId}
      timeSlots={timeSlots}
      blockedDates={blockedDates}
      maxCapacity={maxCapacity}
      onSelect={onSelect}
      selectedDate={selectedDate}
      selectedTime={selectedTime}
      rules={rules}
    />
  );
};

export default ServiceBookingCalendar;
