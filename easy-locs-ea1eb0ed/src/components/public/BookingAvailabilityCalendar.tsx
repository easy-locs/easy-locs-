import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { format, eachDayOfInterval, parseISO, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Props {
  label: string;
  value: string;
  onChange: (dateStr: string) => void;
  minDate?: string;
  bookedDates: { check_in: string; check_out: string }[];
  blockedDates?: string[];
}

export default function BookingAvailabilityCalendar({ label, value, onChange, minDate, bookedDates, blockedDates = [] }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const disabledDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfDay(new Date());

    // Add all booked date ranges
    for (const b of bookedDates) {
      try {
        const start = parseISO(b.check_in);
        const end = parseISO(b.check_out);
        if (start < end) {
          const range = eachDayOfInterval({ start, end: new Date(end.getTime() - 86400000) }); // exclude checkout day
          days.push(...range);
        }
      } catch {}
    }

    // Add explicitly blocked dates
    for (const d of blockedDates) {
      try { days.push(parseISO(d)); } catch {}
    }

    return days;
  }, [bookedDates, blockedDates]);

  const minDateObj = minDate ? parseISO(minDate) : startOfDay(new Date());
  const selectedDate = value ? parseISO(value) : undefined;

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, minDateObj)) return true;
    return disabledDays.some(d => d.getTime() === date.getTime());
  };

  return (
    <fieldset className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label} *</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal rounded-xl px-4 py-3 h-auto",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-4 w-4 mr-2 shrink-0" />
            {value ? format(parseISO(value), "dd/MM/yyyy") : t("common.select_date")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            disabled={isDateDisabled}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            modifiers={{
              booked: disabledDays,
            }}
            modifiersStyles={{
              booked: {
                backgroundColor: "hsl(var(--destructive) / 0.15)",
                color: "hsl(var(--destructive))",
                textDecoration: "line-through",
              },
            }}
          />
          <div className="px-3 pb-3 flex items-center gap-3 text-[0.625rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-destructive/15 border border-destructive/30" />
              {t("common.unavailable")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-primary" />
              {t("common.selected")}
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </fieldset>
  );
}
