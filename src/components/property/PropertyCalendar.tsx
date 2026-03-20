import { usePropertyDetailStore } from "@/stores/propertyDetailStore";

export function PropertyCalendar() {
  const days = usePropertyDetailStore((s) => s.calendarDays);

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Availability Calendar</h3>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            className={`rounded p-1 text-center text-xs ${
              day.available
                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                : "bg-destructive/20 text-destructive"
            }`}
          >
            <p className="font-medium">{day.date.slice(-2)}</p>
            <p className="text-[10px]">{day.available ? "Available" : "Blocked"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
