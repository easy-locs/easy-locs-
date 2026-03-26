/**
 * RideLiveHealthBanner — GPS/realtime connection health indicator.
 */
import { tc } from "@/lib/i18n-canonical";

interface Props {
  gpsSignal: "strong" | "weak" | "lost";
  lastSyncAt?: string | null;
  realtimeConnected?: boolean;
}

export function RideLiveHealthBanner({
  gpsSignal,
  lastSyncAt,
  realtimeConnected = true,
}: Props) {
  const age =
    lastSyncAt ? Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 1000) : null;

  if (gpsSignal === "strong" && realtimeConnected) return null;

  let text = tc("ride.live_sync_issue");
  if (gpsSignal === "weak") text = tc("ride.gps_weak");
  if (gpsSignal === "lost") text = tc("ride.gps_lost");
  if (!realtimeConnected) text = tc("ride.reconnecting_live");

  return (
    <div className="flex items-center gap-2 bg-destructive/10 rounded-xl px-3 py-2 border border-destructive/20">
      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
      <span className="text-xs text-destructive font-medium">{text}</span>
      {age != null && (
        <span className="text-[10px] text-muted-foreground ml-auto">
          {tc("ride.last_update_seconds", { seconds: String(age) })}
        </span>
      )}
    </div>
  );
}
