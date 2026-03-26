import React from "react";
import { useRide, useRideEvents, useRideRealtime, useRideTracking } from "@/hooks/useRides";
import { cancelRide, updateRideStatus } from "@/lib/rides/service";
import { TrackingPusher } from "@/components/rides/TrackingPusher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Clock, Locate, XCircle, Play, CheckCircle2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  searching: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Searching driver..." },
  scheduled: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Scheduled" },
  accepted: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Driver assigned" },
  driver_en_route: { color: "bg-primary/10 text-primary border-primary/20", label: "Driver en route" },
  arrived: { color: "bg-violet-500/10 text-violet-600 border-violet-500/20", label: "Driver arrived" },
  in_progress: { color: "bg-sky-500/10 text-sky-600 border-sky-500/20", label: "In progress" },
  completed: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Completed" },
  cancelled: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Cancelled" },
  failed: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Failed" },
};

export function RideLiveCard({ rideId }: { rideId: string }) {
  useRideRealtime(rideId);
  const { data: ride } = useRide(rideId);
  const { data: events } = useRideEvents(rideId);
  const { data: tracking } = useRideTracking(rideId);

  if (!ride) return <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />;

  const isFinal = ["completed", "cancelled", "failed"].includes(ride.status);
  const isDriverActive = ["accepted", "driver_en_route", "arrived", "in_progress"].includes(ride.status);
  const statusInfo = STATUS_CONFIG[ride.status] ?? { color: "bg-muted text-muted-foreground", label: ride.status };

  return (
    <>
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm">
      {/* Status bar */}
      <div className={cn("px-4 py-2.5 flex items-center justify-between border-b", statusInfo.color)}>
        <div className="flex items-center gap-2">
          {ride.status === "searching" && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
          <span className="text-xs font-bold">{statusInfo.label}</span>
        </div>
        <span className="text-[10px] uppercase font-bold opacity-60">{ride.ride_type}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Locations */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{ride.pickup_label}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{ride.dropoff_label}</span>
          </div>
        </div>

        {/* Price */}
        {ride.estimated_price != null && (
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Estimated</span>
            <span className="text-sm font-bold text-foreground">{ride.estimated_price} {ride.currency}</span>
          </div>
        )}

        {/* Tracking */}
        {tracking && (
          <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
            <Locate className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">
              Driver: {tracking.lat.toFixed(4)}, {tracking.lng.toFixed(4)}
              {tracking.speed_kmh != null && <span className="ml-1 opacity-70">· {tracking.speed_kmh.toFixed(0)} km/h</span>}
            </span>
          </div>
        )}

        {/* Actions */}
        {!isFinal && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ride.status === "accepted" && (
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg gap-1" onClick={() => updateRideStatus(rideId, "driver_en_route").catch(e => toast.error(e.message))}>
                <Truck className="h-3 w-3" /> En route
              </Button>
            )}
            {ride.status === "driver_en_route" && (
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg gap-1" onClick={() => updateRideStatus(rideId, "arrived").catch(e => toast.error(e.message))}>
                <MapPin className="h-3 w-3" /> Arrived
              </Button>
            )}
            {ride.status === "arrived" && (
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg gap-1" onClick={() => updateRideStatus(rideId, "in_progress").catch(e => toast.error(e.message))}>
                <Play className="h-3 w-3" /> Start
              </Button>
            )}
            {ride.status === "in_progress" && (
              <Button size="sm" className="h-8 text-xs rounded-lg gap-1" onClick={() => updateRideStatus(rideId, "completed").catch(e => toast.error(e.message))}>
                <CheckCircle2 className="h-3 w-3" /> Complete
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg gap-1 text-destructive hover:text-destructive ml-auto" onClick={() => cancelRide(rideId).catch(e => toast.error(e.message))}>
              <XCircle className="h-3 w-3" /> Cancel
            </Button>
          </div>
        )}

        {/* Timeline */}
        {(events ?? []).length > 0 && (
          <div className="border-t border-border/20 pt-2 mt-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Timeline</p>
            <div className="space-y-1">
              {(events ?? []).slice(-5).map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="opacity-60">{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="font-medium">{e.event_type.replace("ride.", "")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    {isDriverActive && <TrackingPusher rideId={rideId} />}
    </>
  );
}
