/**
 * RideLiveHealthBanner — GPS/realtime connection health indicator.
 */
import { tc } from "@/lib/i18n-canonical";
import { cn } from "@/lib/utils";

interface Props {
  gpsSignal: "strong" | "weak" | "lost";
  lastSyncAt?: string | null;
  staleSeconds?: number | null;
  realtimeConnected?: boolean;
}

export function RideLiveHealthBanner({
  gpsSignal,
  lastSyncAt,
  staleSeconds,
  realtimeConnected = true,
}: Props) {
  if (gpsSignal === "strong" && realtimeConnected && (staleSeconds ?? 0) < 20) {
    return null;
  }

  let title = tc("ride.live_sync_issue");
  let tone = "border-amber-300/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200";

  if (!realtimeConnected) {
    title = tc("ride.reconnecting_live");
  } else if (gpsSignal === "weak") {
    title = tc("ride.gps_weak");
  } else if (gpsSignal === "lost") {
    title = tc("ride.gps_lost");
    tone = "border-destructive/20 bg-destructive/10 text-destructive";
  }

  const age = staleSeconds ?? (lastSyncAt ? Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 1000) : null);

  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 border", tone)}>
      <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
      <span className="text-xs font-medium">{title}</span>
      {age != null && (
        <span className="text-[10px] opacity-70 ml-auto">
          {tc("ride.last_update_seconds", { seconds: String(age) })}
        </span>
      )}
    </div>
  );
}
