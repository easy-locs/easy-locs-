import React from "react";
import { useDriverOpenRides } from "@/hooks/useRides";
import { acceptRide } from "@/lib/rides/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Clock, Check } from "lucide-react";

export function DriverOpenRidesPanel() {
  const { data, isLoading, error } = useDriverOpenRides();

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="h-28 bg-muted/40 rounded-xl animate-pulse" />)}
    </div>
  );
  if (error) return <div className="p-4 text-destructive text-sm">Error loading rides</div>;

  const rides = data ?? [];
  if (!rides.length) return (
    <div className="text-center py-12">
      <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium text-muted-foreground">No open rides</p>
      <p className="text-xs text-muted-foreground/60 mt-1">New ride requests will appear here</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {rides.map((ride) => (
        <div key={ride.id} className="bg-card border border-border/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground capitalize">{ride.ride_type}</span>
              <Badge variant="outline" className="text-[10px]">{ride.booking_mode === "scheduled" ? "📅 Scheduled" : "🚀 Now"}</Badge>
            </div>
            <Badge variant="secondary" className="text-[10px]">{ride.status}</Badge>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="truncate">{ride.pickup_label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{ride.dropoff_label}</span>
            </div>
          </div>

          {ride.estimated_price != null && (
            <div className="text-xs font-semibold text-foreground">
              Est. {ride.estimated_price} {ride.currency}
            </div>
          )}

          <Button size="sm" className="w-full h-9 rounded-xl text-xs font-bold gap-1.5" onClick={async () => {
            try { await acceptRide(ride.id); toast.success("Ride accepted!"); }
            catch (err: any) { toast.error(err.message); }
          }}>
            <Check className="h-3.5 w-3.5" /> Accept ride
          </Button>
        </div>
      ))}
    </div>
  );
}
