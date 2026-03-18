/**
 * TrackRidePage — /track/:rideRequestId — Live driver tracking with map + CTA footer.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import DriverMap from "@/components/radar/DriverMap";
import { supabase } from "@/integrations/supabase/client";
import { useRideRequestController } from "@/hooks/useRideRequestController";

export default function TrackRidePage() {
  const { rideRequestId } = useParams();
  const navigate = useNavigate();
  const [rideMeta, setRideMeta] = useState<any>(null);

  useEffect(() => {
    if (!rideRequestId) return;
    supabase
      .from("ride_requests" as any)
      .select("pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, thread_id, status")
      .eq("id", rideRequestId)
      .single()
      .then(({ data }) => setRideMeta(data ?? null));
  }, [rideRequestId]);

  const controller = useRideRequestController({
    rideRequestId: rideRequestId ?? null,
    pickupLat: rideMeta?.pickup_lat ?? null,
    pickupLng: rideMeta?.pickup_lng ?? null,
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

        <div className="h-52 rounded-2xl overflow-hidden border border-border">
          <DriverMap
            driverId={controller.selectedDriverId ?? undefined}
            pickupLat={rideMeta?.pickup_lat}
            pickupLng={rideMeta?.pickup_lng}
            dropoffLat={rideMeta?.dropoff_lat}
            dropoffLng={rideMeta?.dropoff_lng}
          />
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

        <div className="flex gap-2">
          {rideMeta?.thread_id && (
            <button
              onClick={() => navigate(`/call/${rideMeta.thread_id}`)}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground"
            >
              📞 Call driver
            </button>
          )}

          {rideRequestId && (
            <button
              onClick={() => navigate(`/ride/receipt/${rideRequestId}`)}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
            >
              🧾 Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
