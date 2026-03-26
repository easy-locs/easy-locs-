/**
 * DriverLiveTripCard — Rider-only active trip card.
 * Shows: pickup/dropoff, status progression buttons, GPS push.
 * Does NOT show: cancel (customer-only), accept (offer phase).
 */
import { useEffect, useRef } from "react";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Navigation, Truck, Play, CheckCircle2, Locate } from "lucide-react";
import { cn } from "@/lib/utils";

const NEXT_STATUS: Record<string, { label: string; icon: React.ReactNode; status: string }> = {
  accepted: { label: "I'm on my way", icon: <Truck className="h-3.5 w-3.5" />, status: "rider_arriving" },
  rider_arriving: { label: "I've arrived", icon: <MapPin className="h-3.5 w-3.5" />, status: "rider_arrived" },
  rider_arrived: { label: "Start trip", icon: <Play className="h-3.5 w-3.5" />, status: "in_progress" },
  in_progress: { label: "Complete trip", icon: <CheckCircle2 className="h-3.5 w-3.5" />, status: "completed" },
};

export function DriverLiveTripCard({ jobId, job }: { jobId: string; job: any }) {
  const advanceJobStatus = useRiderDispatchStore(s => s.advanceJobStatus);
  const { pushRiderLocation, startTracking } = useTripTrackingStore();
  const geoInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start tracking and GPS push on mount
  useEffect(() => {
    startTracking(jobId);

    const pushGeo = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          pushRiderLocation(jobId, pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined, pos.coords.speed ? pos.coords.speed * 3.6 : undefined);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    };

    pushGeo();
    geoInterval.current = setInterval(pushGeo, 10000);
    return () => { if (geoInterval.current) clearInterval(geoInterval.current); };
  }, [jobId]);

  const nextAction = NEXT_STATUS[job?.status];

  const handleAdvance = async () => {
    if (!nextAction) return;
    try {
      await advanceJobStatus(jobId, nextAction.status);
      toast.success(nextAction.status === "completed" ? "Trip completed! 🎉" : "Status updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <Locate className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="text-xs font-bold text-primary">Active trip</span>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase font-bold">{job?.status}</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job?.pickup_address || "Pickup"}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job?.dropoff_address || "Dropoff"}</span>
          </div>
        </div>

        {job?.fare_amount != null && (
          <div className="flex items-center justify-between bg-emerald-500/5 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Fare</span>
            <span className="text-sm font-bold text-emerald-600">{job.fare_amount} {job.currency ?? "AED"}</span>
          </div>
        )}

        {nextAction && (
          <Button
            className="w-full h-11 rounded-xl text-sm font-bold gap-2"
            onClick={handleAdvance}
          >
            {nextAction.icon} {nextAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
