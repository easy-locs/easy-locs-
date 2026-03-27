/**
 * MapLegend — Compact, minimal legend with colored dots only.
 */
import { LEGEND_ITEMS } from "@/lib/map/map-style-helpers";
import { kindToColor } from "@/lib/map/map-style-helpers";
import { cn } from "@/lib/utils";

export function MapLegend({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-white/[0.05] bg-black/60 backdrop-blur-xl p-2 shadow-lg",
      className,
    )}>
      <div className="flex flex-wrap gap-x-2.5 gap-y-1">
        {LEGEND_ITEMS.slice(0, 6).map(({ kind, label }) => (
          <span key={kind} className="flex items-center gap-1 text-[9px] text-white/50">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: kindToColor(kind) }}
            />
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
