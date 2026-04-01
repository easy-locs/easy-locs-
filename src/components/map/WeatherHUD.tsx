/**
 * WeatherHUD — Premium floating weather capsule for the map.
 * Shows live temperature, condition icon, and live badge.
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
          "inline-flex items-center gap-2 rounded-[18px] border px-3 py-2 shadow-lg backdrop-blur-xl transition-all",
          isRaining
            ? "border-primary/20 bg-[rgba(12,18,32,0.85)]"
            : "border-white/[0.08] bg-[rgba(12,18,32,0.76)]"
        )}
      >
        <span className="text-base leading-none">{loading ? "⏳" : icon}</span>
        <span className="text-[14px] font-semibold text-white/90">{shortLabel}</span>
      </div>

      {/* Live badge */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[rgba(12,18,32,0.76)] px-2.5 py-1.5 shadow-sm backdrop-blur-xl">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[11px] font-semibold text-white/70">LIVE</span>
      </div>
    </div>
  );
});
