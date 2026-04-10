/**
 * GPSHealthBadge — Displays GPS sync status for drivers.
 */
import { cn } from "@/lib/utils";
import { tc } from "@/lib/i18n-canonical";
import { Wifi, WifiOff, Signal } from "lucide-react";
import type { GPSHealth } from "@/lib/mobility/gps-scheduler";

export function GPSHealthBadge({ health }: { health: GPSHealth }) {
  const signalConfig = {
    strong: { icon: <Signal className="w-3 h-3" />, color: "text-emerald-500 bg-emerald-500/10", label: tc("ride.gps_strong") },
    weak: { icon: <Wifi className="w-3 h-3" />, color: "text-amber-500 bg-amber-500/10", label: tc("ride.gps_weak") },
    lost: { icon: <WifiOff className="w-3 h-3" />, color: "text-destructive bg-destructive/10", label: tc("ride.gps_lost") },
  };

  const cfg = signalConfig[health.signal];

  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold", cfg.color)}>
      {cfg.icon}
      <span>{cfg.label}</span>
      {health.lastSyncAt && (
        <span className="opacity-60">
          · {Math.round((Date.now() - new Date(health.lastSyncAt).getTime()) / 1000)}s
        </span>
      )}
    </div>
  );
}
