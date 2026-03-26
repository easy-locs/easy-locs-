/**
 * CustomerJobCard — Customer-only view of their ride.
 * Shows: status, pickup/dropoff, tracking, cancel button.
 * Does NOT show: accept, advance status, or rider controls.
 */
import { useEffect } from "react";
import { useCustomerRideStore, type CustomerJob } from "@/stores/customerRideStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Locate, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  searching: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Searching rider..." },
  pending: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Pending..." },
  assigned: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Rider assigned" },
  accepted: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Rider accepted" },
  rider_arriving: { color: "bg-primary/10 text-primary border-primary/20", label: "Rider on the way" },
  rider_arrived: { color: "bg-violet-500/10 text-violet-600 border-violet-500/20", label: "Rider arrived" },
  in_progress: { color: "bg-sky-500/10 text-sky-600 border-sky-500/20", label: "Trip in progress" },
  completed: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Completed" },
  cancelled: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Cancelled" },
};

export function CustomerJobCard({ job }: { job: CustomerJob }) {
  const cancelRide = useCustomerRideStore(s => s.cancelRide);
  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();

  const isFinal = ["completed", "cancelled"].includes(job.status);
  const isTracking = ["accepted", "rider_arriving", "rider_arrived", "in_progress"].includes(job.status);
  const statusInfo = STATUS_MAP[job.status] ?? { color: "bg-muted text-muted-foreground", label: job.status };

  useEffect(() => {
    if (isTracking) startTracking(job.id);
    return () => { stopTracking(); };
  }, [job.id, isTracking]);

  const handleCancel = async () => {
    try {
      await cancelRide(job.id, "Customer cancelled");
      toast.success("Ride cancelled");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm">
      {/* Status bar */}
      <div className={cn("px-4 py-2.5 flex items-center justify-between border-b", statusInfo.color)}>
        <div className="flex items-center gap-2">
          {job.status === "searching" && <Loader2 className="h-3 w-3 animate-spin" />}
          <span className="text-xs font-bold">{statusInfo.label}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">{job.currency ?? "AED"}</Badge>
      </div>

      <div className="p-4 space-y-3">
        {/* Locations */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job.pickup_address || "Pickup"}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job.dropoff_address || "Dropoff"}</span>
          </div>
        </div>

        {/* Price */}
        {(job.fare_amount ?? job.delivery_fee) != null && (
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Fare</span>
            <span className="text-sm font-bold text-foreground">
              {job.fare_amount ?? job.delivery_fee} {job.currency ?? "AED"}
              {(job.surge_multiplier ?? 1) > 1 && (
                <span className="ml-1 text-xs text-amber-500">×{job.surge_multiplier}</span>
              )}
            </span>
          </div>
        )}

        {/* Live tracking */}
        {isTracking && livePosition?.riderLat && (
          <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
            <Locate className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">
              Rider: {livePosition.riderLat.toFixed(4)}, {livePosition.riderLng?.toFixed(4)}
              {livePosition.riderSpeed != null && (
                <span className="ml-1 opacity-70">· {livePosition.riderSpeed.toFixed(0)} km/h</span>
              )}
            </span>
          </div>
        )}

        {/* Cancel button — customer only action */}
        {!isFinal && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-9 text-xs rounded-xl gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleCancel}
          >
            <XCircle className="h-3.5 w-3.5" /> Cancel ride
          </Button>
        )}
      </div>
    </div>
  );
}
