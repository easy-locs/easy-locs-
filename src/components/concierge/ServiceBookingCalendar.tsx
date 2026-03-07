import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, startOfDay } from "date-fns";

interface TimeSlot {
  start: string;
  end: string;
}

interface Props {
  timeSlots: TimeSlot[];
  blockedDates: string[];
  onSelect: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
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

const ServiceBookingCalendar = ({ timeSlots, blockedDates, onSelect, selectedDate, selectedTime }: Props) => {
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const slots = timeSlots.length > 0 ? timeSlots : DEFAULT_SLOTS;

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const today = startOfDay(new Date());

  const isDateBlocked = (d: Date) => {
    return isBefore(d, today) || blockedSet.has(format(d, "yyyy-MM-dd"));
  };

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
          className="rounded-xl border border-border"
        />
      </div>
      {date && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Available times — {format(date, "dd/MM/yyyy")}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => (
              <Button
                key={slot.start}
                variant={selectedTime === slot.start ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => onSelect(date, slot.start)}
              >
                {slot.start}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBookingCalendar;
