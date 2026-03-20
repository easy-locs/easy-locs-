const STEPS = [
  "confirmed",
  "preparing",
  "driver_assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "completed",
];

export function CustomerOrderStateTimelineCard({ status }: { status: string }) {
  const currentIndex = Math.max(0, STEPS.indexOf(status));

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Order Timeline</p>
      {STEPS.map((step, i) => {
        const active = i <= currentIndex;
        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                active ? "bg-primary" : "bg-muted"
              }`}
            />
            <span
              className={`text-xs capitalize ${
                active ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {step.replace(/_/g, " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
