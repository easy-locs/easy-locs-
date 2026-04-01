/**
 * WeatherHUD — Premium floating weather capsule for the map.
 * Uber/Apple style: compact, glass, informative.
 */
import { memo } from "react";
import { cn } from "@/lib/utils";

interface WeatherHUDProps {
  icon: string;
  label: string;
  shortLabel: string;
  loading: boolean;
  isRaining: boolean;
}

export default memo(function WeatherHUD({ icon, label, shortLabel, loading, isRaining }: WeatherHUDProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Weather capsule */}
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur-xl transition-all",
          isRaining
            ? "border-primary/20 bg-[rgba(12,18,32,0.88)]"
            : "border-white/[0.08] bg-[rgba(12,18,32,0.78)]"
        )}
      >
        <span className="text-base leading-none">{loading ? "⏳" : icon}</span>
        <span className="text-[13px] font-semibold text-white/90 tracking-tight">{shortLabel}</span>
      </div>

      {/* Live badge */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-[rgba(12,18,32,0.78)] px-2.5 py-1.5 shadow-sm backdrop-blur-xl">
        <span className="relative flex h-[6px] w-[6px]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold tracking-widest text-white/50">LIVE</span>
      </div>
    </div>
  );
});
