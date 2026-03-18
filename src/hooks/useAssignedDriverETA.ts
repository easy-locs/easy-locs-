/**
 * useAssignedDriverETA — Compute live ETA from tracked driver position to pickup.
 */
import { useMemo } from "react";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import { computeLiveETA } from "@/lib/radar/live-eta";

export function useAssignedDriverETA({
  driverId,
  pickupLat,
  pickupLng,
}: {
  driverId: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
}) {
  const { position, connected } = useDriverTracking(driverId);

  const eta = useMemo(() => {
    if (!position || pickupLat == null || pickupLng == null) return null;
    return computeLiveETA(
      position.lat,
      position.lng,
      pickupLat,
      pickupLng,
      position.speed ? Math.max(18, position.speed) : 30,
    );
  }, [position, pickupLat, pickupLng]);

  return { position, connected, eta };
}
