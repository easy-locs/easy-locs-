/**
 * SeasonalCalendarGrid — Calendar month grid showing booking occupancy.
 * Pure UI. Data passed via props.
 */
import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";

interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

interface Props {
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  bookings: Booking[];
  dayNames: string[];
  onEditBooking: (b: Booking) => void;
  onDeleteBooking: (id: string) => void;
}

export default function SeasonalCalendarGrid({
  calMonth, setCalMonth, bookings, dayNames, onEditBooking, onDeleteBooking,
}: Props) {
  const calDays = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calMonth]);

  const bookingsForDay = (day: number) => {
    const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter(b => b.check_in <= dateStr && b.check_out > dateStr);
  };

  const monthLabel = calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const LANE_COLORS = [
    "bg-primary/15 text-primary border-l-2 border-primary/40",
    "bg-accent/15 text-accent border-l-2 border-accent/40",
    "bg-orange-500/15 text-orange-700 border-l-2 border-orange-400/40",
  ];

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} className="p-2 hover:bg-muted rounded-lg">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-semibold text-foreground capitalize">{monthLabel}</h3>
        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} className="p-2 hover:bg-muted rounded-lg">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {dayNames.map(d => (
          <div key={d} className="text-center text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {calDays.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayBookings = bookingsForDay(day);
          const MAX_VISIBLE = 2;
          const visible = dayBookings.slice(0, MAX_VISIBLE);
          const overflow = dayBookings.length - MAX_VISIBLE;
          return (
            <div
              key={i}
              className={`min-h-[52px] sm:min-h-[68px] p-0.5 sm:p-1 rounded-lg border text-xs relative overflow-hidden ${
                dayBookings.length > 0 ? "border-primary/30 bg-primary/5" : "border-border/30"
              }`}
            >
              <span className="text-foreground font-medium block mb-0.5">{day}</span>
              <div className="space-y-0.5">
                {visible.map((b, idx) => (
                  <div
                    key={b.id}
                    className={`text-[10px] px-1 py-px rounded truncate cursor-pointer hover:opacity-80 group/booking ${LANE_COLORS[idx % LANE_COLORS.length]}`}
                    title={`${b.guest_name} (${b.check_in} → ${b.check_out})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditBooking(b);
                    }}
                  >
                    <span className="flex items-center gap-0.5">
                      {b.guest_name}
                      <span className="hidden group-hover/booking:inline-flex items-center gap-0.5 ml-auto">
                        <Edit className="h-2.5 w-2.5" />
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteBooking(b.id); }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div
                    className="text-[10px] text-muted-foreground font-medium px-1"
                    title={dayBookings.slice(MAX_VISIBLE).map(b => b.guest_name).join(", ")}
                  >
                    +{overflow}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
