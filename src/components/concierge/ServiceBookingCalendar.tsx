import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
  /** Slot interval in minutes (e.g. 30, 60) — used to generate slots if none provided */
  slotInterval?: number;
  /** Duration per booking in minutes */
  durationMinutes?: number;
  /** Max capacity per slot/day */
  maxCapacity?: number | null;
  /** Minimum notice in hours before booking */
  minNoticeHours?: number;
  /** Maximum days in advance for booking */
  maxAdvanceDays?: number;
  /** Days of week available (0=Sun, 1=Mon … 6=Sat) */
  availableDays?: number[];
  /** Opening hour (e.g. 8) */
  openHour?: number;
  /** Closing hour (e.g. 20) */
  closeHour?: number;
  /** Whether this is a daily (range) or hourly (slot) booking */
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
  /** Activity-specific rules for dynamic calendar behavior */
  rules?: ActivityBookingRules;
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

/** Generate time slots from rules (interval + open/close hours) */
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

/** Deduplicate time slots by start time */
function deduplicateSlots(slots: TimeSlot[]): TimeSlot[] {
  const seen = new Set<string>();
  return slots.filter(s => {
    if (seen.has(s.start)) return false;
    seen.add(s.start);
    return true;
  });
}

/** Statuses that occupy a slot */
const OCCUPYING_STATUSES = new Set(["pending", "awaiting_payment", "paid", "confirmed", "in_progress", "completed"]);
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const ServiceBookingCalendar = ({
  serviceId,
  timeSlots,
  blockedDates,
  maxCapacity,
  onSelect,
  onSelectRange,
  selectedDate,
  selectedTime,
  rangeMode = false,
  selectedRange,
  rules,
}: Props) => {
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [range, setRange] = useState<DateRange | undefined>(
    selectedRange ? { from: selectedRange.from, to: selectedRange.to } : undefined
  );
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Resolve effective capacity from rules or prop
  const effectiveCapacity = rules?.maxCapacity ?? maxCapacity ?? 1;

  // Resolve slots: from explicit timeSlots, or generated from rules, or defaults
  const slots = useMemo(() => {
    if (timeSlots.length > 0) return deduplicateSlots(timeSlots);
    if (rules?.slotInterval || rules?.openHour !== undefined) {
      return deduplicateSlots(generateSlotsFromRules(rules));
    }
    return deduplicateSlots(DEFAULT_SLOTS);
  }, [timeSlots, rules]);

  // Compute minimum booking date from minNoticeHours
  const minDate = useMemo(() => {
    const now = new Date();
    if (rules?.minNoticeHours) {
      return new Date(now.getTime() + rules.minNoticeHours * 3600000);
    }
    return startOfDay(now);
  }, [rules?.minNoticeHours]);

  // Compute maximum booking date from maxAdvanceDays
  const maxDate = useMemo(() => {
    if (rules?.maxAdvanceDays) {
      return addDays(startOfDay(new Date()), rules.maxAdvanceDays);
    }
    return undefined;
  }, [rules?.maxAdvanceDays]);

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const today = startOfDay(new Date());

  // Available days of week
  const availableDaysSet = useMemo(() => {
    if (rules?.availableDays && rules.availableDays.length > 0) {
      return new Set(rules.availableDays);
    }
    return null; // all days available
  }, [rules?.availableDays]);

  // ── Load existing bookings ──
  useEffect(() => {
    if (!serviceId) return;

    const loadBookings = async () => {
      setLoadingSlots(true);

      const { data, error } = await supabase
        .rpc("get_public_service_availability", { p_service_id: serviceId });

      if (error) {
        console.error("availability load error", error);
        setBookedSlots([]);
        setLoadingSlots(false);
        return;
      }

      setBookedSlots((data as unknown as BookedSlot[] | null) || []);
      setLoadingSlots(false);
    };

    loadBookings();

    const channel = supabase
      .channel(`booking-calendar-${serviceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "concierge_orders", filter: `service_id=eq.${serviceId}` },
        () => { loadBookings(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_bookings", filter: `service_id=eq.${serviceId}` },
        () => { loadBookings(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [serviceId]);

  // ── Compute booked dates/times ──
  const { fullyBookedDates, bookedTimesByDate, bookingCountByDate, bookedRanges } = useMemo(() => {
    const countByDate: Record<string, number> = {};
    const timesByDate: Record<string, Set<string>> = {};
    const ranges: { from: string; to: string }[] = [];

    for (const b of bookedSlots) {
      if (!b.service_date) continue;

      const isRangeBooking = typeof b.end_time === "string" && DATE_ONLY_PATTERN.test(b.end_time);

      if (isRangeBooking) {
        ranges.push({ from: b.service_date, to: b.end_time as string });
        try {
          const days = eachDayOfInterval({
            start: parseDateOnly(b.service_date),
            end: parseDateOnly(b.end_time as string),
          });
          for (const day of days) {
            const ds = format(day, "yyyy-MM-dd");
            countByDate[ds] = (countByDate[ds] || 0) + 1;
          }
        } catch {
          // invalid date range
        }
        continue;
      }

      const dateStr = b.service_date;
      countByDate[dateStr] = (countByDate[dateStr] || 0) + (b.quantity || 1);

      if (b.service_time) {
        if (!timesByDate[dateStr]) timesByDate[dateStr] = new Set();
        timesByDate[dateStr].add(b.service_time);
      }
    }

    const capacity = effectiveCapacity;
    const fullyBooked = new Set<string>();

    for (const [dateStr, count] of Object.entries(countByDate)) {
      if (slots.length > 0 && timesByDate[dateStr]) {
        const allSlotsTaken = slots.every(slot => timesByDate[dateStr]?.has(slot.start));
        if (allSlotsTaken) fullyBooked.add(dateStr);
      } else if (count >= capacity) {
        fullyBooked.add(dateStr);
      }
    }

    return {
      fullyBookedDates: fullyBooked,
      bookedTimesByDate: timesByDate,
      bookingCountByDate: countByDate,
      bookedRanges: ranges,
    };
  }, [bookedSlots, effectiveCapacity, slots]);

  const isDateBlocked = (d: Date) => {
    const dateStr = format(d, "yyyy-MM-dd");
    // Past dates
    if (isBefore(d, today)) return true;
    // Before minimum notice
    if (isBefore(d, startOfDay(minDate))) return true;
    // After max advance
    if (maxDate && isBefore(maxDate, d)) return true;
    // Blocked dates
    if (blockedSet.has(dateStr)) return true;
    // Fully booked
    if (fullyBookedDates.has(dateStr)) return true;
    // Day of week not available
    if (availableDaysSet && !availableDaysSet.has(d.getDay())) return true;
    return false;
  };

  // ── Range mode ──
  if (rangeMode) {
    const handleRangeSelect = (newRange: DateRange | undefined) => {
      setRange(newRange);
      if (newRange?.from && newRange?.to && onSelectRange) {
        onSelectRange(newRange.from, newRange.to);
      }
    };

    const rangeDays = range?.from && range?.to
      ? differenceInCalendarDays(range.to, range.from)
      : 0;

    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleRangeSelect}
            disabled={isDateBlocked}
            numberOfMonths={1}
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

        {loadingSlots && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading availability...
          </div>
        )}

        {range?.from && (
          <div className="text-center space-y-1">
            <p className="text-sm text-foreground font-medium">
              {format(range.from, "dd/MM/yyyy")}
              {range.to ? ` → ${format(range.to, "dd/MM/yyyy")}` : " → Select end date"}
            </p>
            {rangeDays > 0 && (
              <Badge variant="secondary" className="text-xs">
                {rangeDays} {rangeDays === 1 ? "day" : "days"}
              </Badge>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning/30" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive/30 line-through" /> Unavailable
          </span>
        </div>
      </div>
    );
  }

  // ── Single date mode ──
  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const bookedTimesForDate = bookedTimesByDate[selectedDateStr] || new Set<string>();
  const dateBookingCount = bookingCountByDate[selectedDateStr] || 0;
  const remainingCapacity = effectiveCapacity - dateBookingCount;

  return (
    <div className="space-y-4">
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

      {loadingSlots && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading availability...
        </div>
      )}

      {date && !loadingSlots && (
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

          {/* Duration badge if specified */}
          {rules?.durationMinutes && (
            <Badge variant="secondary" className="text-[10px]">
              ⏱ {rules.durationMinutes} min per slot
            </Badge>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isBooked = bookedTimesForDate.has(slot.start);
              // Check if slot time is before minimum notice
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

          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
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
};

export default ServiceBookingCalendar;
