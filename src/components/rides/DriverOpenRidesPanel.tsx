import React from "react";
import { useDriverOpenRides } from "@/hooks/useRides";
import { acceptRide } from "@/lib/rides/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function DriverOpenRidesPanel() {
  const { data, isLoading, error } = useDriverOpenRides();

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading rides...</div>;
  if (error) return <div className="p-4 text-destructive">Error loading rides</div>;

  const rides = data ?? [];
  if (!rides.length) return <div className="p-4 text-muted-foreground">No open rides</div>;

  return (
    <div className="space-y-3">
      {rides.map((ride) => (
        <Card key={ride.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{ride.ride_type} · {ride.booking_mode}</CardTitle>
              <Badge variant="outline">{ride.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{ride.pickup_label} → {ride.dropoff_label}</p>
            {ride.estimated_price && <p className="text-xs text-muted-foreground">Est. {ride.estimated_price} {ride.currency}</p>}
            <Button size="sm" className="w-full" onClick={async () => {
              try { await acceptRide(ride.id); toast.success("Ride accepted!"); }
              catch (err: any) { toast.error(err.message); }
            }}>Accept</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
