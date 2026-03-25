import React from "react";
import { useRide, useRideEvents, useRideRealtime, useRideTracking } from "@/hooks/useRides";
import { cancelRide, updateRideStatus } from "@/lib/rides/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function RideLiveCard({ rideId }: { rideId: string }) {
  useRideRealtime(rideId);
  const { data: ride } = useRide(rideId);
  const { data: events } = useRideEvents(rideId);
  const { data: tracking } = useRideTracking(rideId);

  if (!ride) return <div className="p-4 text-muted-foreground">Loading...</div>;

  const isFinal = ["completed", "cancelled", "failed"].includes(ride.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{ride.ride_type}</CardTitle>
          <Badge variant={isFinal ? "secondary" : "default"}>{ride.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-1">
          <p>📍 {ride.pickup_label}</p>
          <p>🏁 {ride.dropoff_label}</p>
          {ride.estimated_price && <p className="text-muted-foreground">Est. {ride.estimated_price} {ride.currency}</p>}
        </div>

        {tracking && (
          <div className="text-xs bg-muted p-2 rounded">
            Driver: {tracking.lat.toFixed(5)}, {tracking.lng.toFixed(5)}
            {tracking.speed_kmh != null && <span> · {tracking.speed_kmh.toFixed(0)} km/h</span>}
          </div>
        )}

        {!isFinal && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => updateRideStatus(rideId, "driver_en_route").catch(e => toast.error(e.message))}>En route</Button>
            <Button size="sm" variant="outline" onClick={() => updateRideStatus(rideId, "arrived").catch(e => toast.error(e.message))}>Arrived</Button>
            <Button size="sm" variant="outline" onClick={() => updateRideStatus(rideId, "in_progress").catch(e => toast.error(e.message))}>Start</Button>
            <Button size="sm" onClick={() => updateRideStatus(rideId, "completed").catch(e => toast.error(e.message))}>Complete</Button>
            <Button size="sm" variant="destructive" onClick={() => cancelRide(rideId).catch(e => toast.error(e.message))}>Cancel</Button>
          </div>
        )}

        {(events ?? []).length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-medium text-muted-foreground">Timeline</p>
            {(events ?? []).map((e) => (
              <div key={e.id} className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleTimeString()} — {e.event_type}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
