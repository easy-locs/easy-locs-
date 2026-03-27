/**
 * MapLegend — Visual legend for canonical map entity kinds.
 */
import { LEGEND_ITEMS } from "@/lib/map/map-style-helpers";
import { cn } from "@/lib/utils";

export function MapLegend({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/20 bg-card/95 backdrop-blur-md p-2.5 shadow-md", className)}>
      <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Legend</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND_ITEMS.map(({ kind, emoji, label }) => (
          <span key={kind} className="flex items-center gap-1 text-[10px] text-foreground">
            <span>{emoji}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
