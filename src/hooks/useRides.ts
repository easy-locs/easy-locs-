import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchDriverOpenRides, fetchMyRides } from "@/lib/rides/service";
import { getLatestTrackingPosition, getRide, listRideEvents } from "@/lib/rides/repository";

export function useMyRides() {
  return useQuery({ queryKey: ["rides"], queryFn: fetchMyRides, staleTime: 10_000 });
}

export function useDriverOpenRides() {
  return useQuery({ queryKey: ["driver-open-rides"], queryFn: fetchDriverOpenRides, staleTime: 5_000 });
}

export function useRide(rideId: string | null) {
  return useQuery({ queryKey: ["ride", rideId], queryFn: () => getRide(rideId!), enabled: !!rideId, staleTime: 5_000 });
}

export function useRideEvents(rideId: string | null) {
  return useQuery({ queryKey: ["ride-events", rideId], queryFn: () => listRideEvents(rideId!), enabled: !!rideId, staleTime: 5_000 });
}

export function useRideTracking(rideId: string | null) {
  return useQuery({ queryKey: ["ride-tracking", rideId], queryFn: () => getLatestTrackingPosition(rideId!), enabled: !!rideId, staleTime: 3_000 });
}

export function useRideRealtime(rideId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`ride-${rideId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` }, () => {
        qc.invalidateQueries({ queryKey: ["ride", rideId] });
        qc.invalidateQueries({ queryKey: ["rides"] });
        qc.invalidateQueries({ queryKey: ["driver-open-rides"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_events", filter: `ride_id=eq.${rideId}` }, () => {
        qc.invalidateQueries({ queryKey: ["ride-events", rideId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_positions", filter: `ride_id=eq.${rideId}` }, () => {
        qc.invalidateQueries({ queryKey: ["ride-tracking", rideId] });
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [qc, rideId]);
}
