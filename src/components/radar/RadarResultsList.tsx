import { useRadarStore } from "@/stores/radarStore";

export function RadarResultsList() {
  const filtered = useRadarStore((s) => s.filtered);

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <span className="text-3xl">📡</span>
        <p className="text-sm font-medium text-foreground">No results nearby</p>
        <p className="text-xs text-muted-foreground">
          Try tapping locate or opening the radar menu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-border/20 bg-card p-3"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.category}
                {item.subcategory ? ` · ${item.subcategory}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
              <span className="text-xs font-medium text-primary">
                {item.distanceKm?.toFixed(1)} km
              </span>
              <span className="text-[10px] text-muted-foreground">
                ⭐ {item.rating ?? 0}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
