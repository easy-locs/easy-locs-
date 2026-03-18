/**
 * UnifiedTimeline — Visual timeline combining order, payment, and delivery milestones.
 */
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/order/unified-order-types";

interface Props {
  events: TimelineEvent[];
  vertical?: boolean;
}

export default function UnifiedTimeline({ events, vertical = false }: Props) {
  if (events.length === 0) return null;

  if (vertical) {
    return (
      <div className="space-y-0">
        {events.map((ev, i) => (
          <div key={ev.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-all",
                ev.current
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : ev.active
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}>
                {ev.icon}
              </div>
              {i < events.length - 1 && (
                <div className={cn(
                  "w-0.5 h-6 rounded-full",
                  ev.active ? "bg-primary/40" : "bg-muted"
                )} />
              )}
            </div>
            <div className="pb-4 pt-0.5">
              <p className={cn(
                "text-xs font-medium",
                ev.current ? "text-primary" : ev.active ? "text-foreground" : "text-muted-foreground"
              )}>
                {ev.label}
              </p>
              {ev.timestamp && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(ev.timestamp).toLocaleString(undefined, {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal (compact for mobile)
  return (
    <div className="flex items-start gap-0.5 overflow-x-auto pb-1">
      {events.map((ev, i) => (
        <div key={ev.key} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center flex-1">
            <div className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-[10px] shrink-0",
              ev.current
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : ev.active
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            )}>
              {ev.icon}
            </div>
            <span className={cn(
              "text-[8px] mt-0.5 text-center leading-tight truncate w-full",
              ev.current ? "font-semibold text-primary" : "text-muted-foreground"
            )}>
              {ev.label}
            </span>
          </div>
          {i < events.length - 1 && (
            <div className={cn(
              "h-0.5 w-full min-w-1 mx-0.5 rounded-full mt-3 shrink-0",
              ev.active ? "bg-primary/40" : "bg-muted"
            )} style={{ maxWidth: 16 }} />
          )}
        </div>
      ))}
    </div>
  );
}
