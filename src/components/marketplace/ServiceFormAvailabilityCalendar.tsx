/**
 * ServiceFormAvailabilityCalendar — Selectable days + hours for service availability.
 */
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Clock, X } from "lucide-react";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00",
];

interface Props {
  timeSlots: Record<string, string[]>; // { "2026-03-15": ["09:00","10:00"] }
  blockedDates: string[];
  onTimeSlotsChange: (slots: Record<string, string[]>) => void;
  onBlockedDatesChange: (dates: string[]) => void;
}

export default function ServiceFormAvailabilityCalendar({
  timeSlots,
  blockedDates,
  onTimeSlotsChange,
  onBlockedDatesChange,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const isBlocked = blockedDates.includes(dateKey);
  const selectedHours = timeSlots[dateKey] || [];

  const toggleHour = (hour: string) => {
    const current = timeSlots[dateKey] || [];
    const next = current.includes(hour)
      ? current.filter(h => h !== hour)
      : [...current, hour].sort();
    onTimeSlotsChange({ ...timeSlots, [dateKey]: next });
  };

  const toggleBlockDate = () => {
    if (isBlocked) {
      onBlockedDatesChange(blockedDates.filter(d => d !== dateKey));
    } else {
      onBlockedDatesChange([...blockedDates, dateKey]);
      // Remove time slots for blocked date
      const { [dateKey]: _, ...rest } = timeSlots;
      onTimeSlotsChange(rest);
    }
  };

  const datesWithSlots = Object.keys(timeSlots).filter(k => timeSlots[k]?.length > 0);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Availability Calendar</Label>
      </div>
      <p className="text-xs text-muted-foreground">Select dates and set available hours. Mark dates as blocked if unavailable.</p>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Calendar */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className={cn("p-3 pointer-events-auto")}
            modifiers={{
              available: datesWithSlots.map(d => new Date(d)),
              blocked: blockedDates.map(d => new Date(d)),
            }}
            modifiersClassNames={{
              available: "bg-primary/20 text-primary font-semibold",
              blocked: "bg-destructive/20 text-destructive line-through",
            }}
          />
        </div>

        {/* Time slots for selected date */}
        {selectedDate && (
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {format(selectedDate, "EEE, MMM d")}
              </p>
              <Button
                type="button"
                variant={isBlocked ? "destructive" : "outline"}
                size="sm"
                onClick={toggleBlockDate}
                className="text-xs h-7"
              >
                {isBlocked ? "Unblock" : "Block Day"}
              </Button>
            </div>

            {!isBlocked && (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Select available hours</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_SLOTS.map(hour => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => toggleHour(hour)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-medium transition-colors",
                        selectedHours.includes(hour)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </>
            )}

            {isBlocked && (
              <p className="text-xs text-destructive">This date is blocked — no bookings allowed.</p>
            )}
          </div>
        )}
      </div>

      {/* Summary badges */}
      {(datesWithSlots.length > 0 || blockedDates.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {datesWithSlots.slice(0, 5).map(d => (
            <Badge key={d} variant="secondary" className="text-[10px] gap-1">
              ✅ {d} ({timeSlots[d].length}h)
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => {
                const { [d]: _, ...rest } = timeSlots;
                onTimeSlotsChange(rest);
              }} />
            </Badge>
          ))}
          {blockedDates.slice(0, 3).map(d => (
            <Badge key={d} variant="destructive" className="text-[10px] gap-1">
              🚫 {d}
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => onBlockedDatesChange(blockedDates.filter(x => x !== d))} />
            </Badge>
          ))}
          {datesWithSlots.length > 5 && <Badge variant="outline" className="text-[10px]">+{datesWithSlots.length - 5} more</Badge>}
        </div>
      )}
    </div>
  );
}
