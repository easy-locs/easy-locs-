/**
 * useRideRequestController — Unified controller combining live status + driver ETA.
 */
import { useMemo } from "react";
import { useRideRequestLive } from "@/hooks/useRideRequestLive";
import { useAssignedDriverETA } from "@/hooks/useAssignedDriverETA";

export function useRideRequestController({
  rideRequestId,
  pickupLat,
  pickupLng,
}: {
  rideRequestId: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
}) {
  const { status, selectedDriverId, currentWave } = useRideRequestLive(rideRequestId);

  const { position, connected, eta } = useAssignedDriverETA({
    driverId: selectedDriverId,
    pickupLat,
    pickupLng,
  });

  return useMemo(() => ({
    status,
    selectedDriverId,
    currentWave,
    driverPosition: position,
    trackingConnected: connected,
    etaMin: eta?.etaMin ?? null,
    distanceKm: eta?.distanceKm ?? null,
  }), [status, selectedDriverId, currentWave, position, connected, eta]);
}
