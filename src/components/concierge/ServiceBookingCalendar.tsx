import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, startOfDay, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
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

interface Props {
  serviceId: string;
  timeSlots: TimeSlot[];
  blockedDates: string[];
  maxCapacity?: number | null;
  onSelect: (date: Date, time: string) => void;
  /** For range mode: callback with start + end dates */
  onSelectRange?: (from: Date, to: Date) => void;
  selectedDate?: Date;
  selectedTime?: string;
  /** Enable date-range selection (for rentals: cars, nights) */
  rangeMode?: boolean;
  selectedRange?: { from: Date; to: Date } | null;
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

/** Deduplicate time slots by start time to prevent visual duplication */
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
}: Props) => {
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [range, setRange] = useState<DateRange | undefined>(
    selectedRange ? { from: selectedRange.from, to: selectedRange.to } : undefined
  );
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const slots = deduplicateSlots(timeSlots.length > 0 ? timeSlots : DEFAULT_SLOTS);

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const today = startOfDay(new Date());

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

    // Also listen to marketplace_bookings for this service
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

      // Range booking: end_time carries the end date (yyyy-MM-dd)
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
            // One range booking occupies one unit per day (quantity in range mode is rental days)
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

    const capacity = maxCapacity || 1;
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
  }, [bookedSlots, maxCapacity, slots]);

  const isDateBlocked = (d: Date) => {
    const dateStr = format(d, "yyyy-MM-dd");
    return (
      isBefore(d, today) ||
      blockedSet.has(dateStr) ||
      fullyBookedDates.has(dateStr)
    );
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
            }}
            modifiersClassNames={{
              booked: "bg-destructive/20 text-destructive line-through",
              partial: "bg-amber-500/15 text-amber-700",
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

  // ── Single date mode (existing) ──
  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const bookedTimesForDate = bookedTimesByDate[selectedDateStr] || new Set<string>();
  const dateBookingCount = bookingCountByDate[selectedDateStr] || 0;
  const remainingCapacity = (maxCapacity || 1) - dateBookingCount;

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
          }}
          modifiersClassNames={{
            booked: "bg-destructive/20 text-destructive line-through",
            partial: "bg-amber-500/15 text-amber-700",
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
            {maxCapacity && maxCapacity > 1 && (
              <Badge variant="outline" className="text-[10px]">
                {remainingCapacity > 0 ? `${remainingCapacity} spots left` : "Fully booked"}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isBooked = bookedTimesForDate.has(slot.start);
              return (
                <Button
                  key={slot.start}
                  variant={selectedTime === slot.start ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "text-xs",
                    isBooked && "opacity-40 line-through cursor-not-allowed"
                  )}
                  disabled={isBooked}
                  onClick={() => onSelect(date, slot.start)}
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
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30" /> Partial
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
