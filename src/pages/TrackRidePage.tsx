/**
 * TrackRidePage — Live driver tracking for an active ride.
 */
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { useRideRequestController } from "@/hooks/useRideRequestController";

export default function TrackRidePage() {
  const { rideRequestId } = useParams();

  const controller = useRideRequestController({
    rideRequestId: rideRequestId ?? null,
    pickupLat: null,
    pickupLng: null,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <BackCard />

        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground">Track your ride</h1>
          <p className="text-xs text-muted-foreground">
            {controller.etaMin != null
              ? `Driver arriving in about ${controller.etaMin} min`
              : "Live driver tracking"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Status</p>
            <p className="text-sm font-semibold text-foreground">{controller.status}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">ETA</p>
            <p className="text-sm font-semibold text-foreground">
              {controller.etaMin != null ? `${controller.etaMin} min` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Distance</p>
            <p className="text-sm font-semibold text-foreground">
              {controller.distanceKm != null ? `${controller.distanceKm.toFixed(1)} km` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
