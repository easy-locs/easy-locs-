/**
 * RideLiveMapCard — Map placeholder + live badges for ETA/distance/traffic.
 */
import { tc } from "@/lib/i18n-canonical";
import type { RideLiveRoute } from "@/lib/mobility/ride-live-route-engine";

interface Props {
  route: RideLiveRoute | null;
}

export function RideLiveMapCard({ route }: Props) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="h-52 relative bg-muted/30">
        <div className="flex items-center justify-center h-full">
          {route ? (
            <div className="text-center space-y-1 p-4">
              <p className="text-sm font-semibold text-foreground">{tc("ride.live_tracking")}</p>
              <p className="text-xs text-muted-foreground">
                Driver: {route.hasLiveDriver ? "✓" : "—"} · Polyline: {route.routeGeometry ? "✓" : "—"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{tc("ride.map_loading")}</p>
          )}
        </div>

        {route && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            {route.etaMinutes != null && (
              <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow text-foreground">
                {route.etaMinutes} min
              </span>
            )}
            {route.distanceKm != null && (
              <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow text-foreground">
                {route.distanceKm} km
              </span>
            )}
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow capitalize text-foreground">
              {tc("ride.traffic")}: {tc(`ride.traffic_${route.trafficLevel}`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
