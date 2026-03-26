/**
 * CustomerJobCard — Customer-only view of their mobility job.
 * Shows: status, pickup/dropoff, live tracking, cancel button.
 * Does NOT show: accept, advance status, or rider controls.
 */
import { useEffect } from "react";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Locate, XCircle, Loader2, Car, Bike, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-muted text-muted-foreground", label: "Draft" },
  pricing: { color: "bg-muted text-muted-foreground", label: "Getting quote..." },
  searching: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Searching rider..." },
  offered: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Sending offers..." },
  accepted: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Rider accepted" },
  rider_arriving_pickup: { color: "bg-primary/10 text-primary border-primary/20", label: "Rider on the way" },
  rider_arrived_pickup: { color: "bg-violet-500/10 text-violet-600 border-violet-500/20", label: "Rider arrived at pickup" },
  picked_up: { color: "bg-sky-500/10 text-sky-600 border-sky-500/20", label: "Picked up" },
  in_progress: { color: "bg-sky-500/10 text-sky-600 border-sky-500/20", label: "Trip in progress" },
  rider_arriving_dropoff: { color: "bg-primary/10 text-primary border-primary/20", label: "Arriving at destination" },
  completed: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Completed" },
  cancelled: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Cancelled" },
  expired: { color: "bg-muted text-muted-foreground", label: "Expired" },
  failed_no_rider: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "No rider found" },
};

const JOB_TYPE_ICON: Record<string, React.ReactNode> = {
  taxi: <Car className="h-3.5 w-3.5" />,
  food_delivery: <Package className="h-3.5 w-3.5" />,
  parcel_delivery: <Bike className="h-3.5 w-3.5" />,
};

export function CustomerJobCard({ job }: { job: MobilityJob }) {
  const cancelJob = useCustomerMobilityStore(s => s.cancelJob);
  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();

  const isFinal = ["completed", "cancelled", "failed_no_rider", "expired"].includes(job.status);
  const isTracking = ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"].includes(job.status);
  const statusInfo = STATUS_MAP[job.status] ?? { color: "bg-muted text-muted-foreground", label: job.status };

  useEffect(() => {
    if (isTracking) startTracking(job.id);
    return () => { stopTracking(); };
  }, [job.id, isTracking]);

  const handleCancel = async () => {
    try {
      await cancelJob(job.id, "Customer cancelled");
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
          {["searching", "offered", "pricing"].includes(job.status) && <Loader2 className="h-3 w-3 animate-spin" />}
          {JOB_TYPE_ICON[job.job_type]}
          <span className="text-xs font-bold">{statusInfo.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{job.service_level.replace(/_/g, ' ')}</Badge>
          <Badge variant="outline" className="text-[10px]">{job.currency}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Locations */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job.pickup_label || job.pickup_address || "Pickup"}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job.dropoff_label || job.dropoff_address || "Dropoff"}</span>
          </div>
        </div>

        {/* Price */}
        {(job.current_price ?? job.quoted_price) != null && (
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Fare</span>
            <span className="text-sm font-bold text-foreground">
              {job.current_price ?? job.quoted_price} {job.currency}
              {(job.surge_multiplier ?? 1) > 1 && (
                <span className="ml-1 text-xs text-amber-500">×{job.surge_multiplier}</span>
              )}
            </span>
          </div>
        )}

        {/* Live tracking */}
        {isTracking && livePosition?.lat && (
          <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
            <Locate className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">
              Rider: {livePosition.lat.toFixed(4)}, {livePosition.lng?.toFixed(4)}
              {livePosition.speed != null && (
                <span className="ml-1 opacity-70">· {livePosition.speed.toFixed(0)} km/h</span>
              )}
            </span>
          </div>
        )}

        {/* Confirmation code */}
        {job.confirmation_code && isTracking && (
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Confirmation code</span>
            <span className="text-sm font-mono font-bold text-foreground tracking-wider">{job.confirmation_code}</span>
          </div>
        )}

        {/* Cancel button — customer only */}
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
