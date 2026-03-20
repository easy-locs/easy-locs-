import { useMemo } from "react";

type Props = {
  status?: string;
  driverName?: string;
  eta?: number;
};

export function LiveOrderTrackingCard({
  status = "preparing",
  driverName,
  eta = 15,
}: Props) {
  const step = useMemo(() => {
    const map: Record<string, number> = {
      preparing: 1,
      ready: 2,
      picked_up: 3,
      on_the_way: 4,
      delivered: 5,
    };
    return map[status] ?? 1;
  }, [status]);

  const steps = ["Preparing", "Ready", "Picked up", "On the way", "Delivered"];

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-4">
      <p className="text-sm font-bold text-foreground">Live Tracking</p>

      <div className="flex items-center gap-1">
        {steps.map((label, i) => {
          const active = i + 1 <= step;
          return (
            <div key={label} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full ${active ? "bg-primary" : "bg-muted"}`} />
              <p className={`text-[10px] mt-1 ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {driverName ? `Driver: ${driverName}` : "Assigning driver..."}
      </p>

      <p className="text-sm font-bold text-foreground">ETA {eta} min</p>
    </div>
  );
}
