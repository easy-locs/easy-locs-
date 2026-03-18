/**
 * useMultiDriverRide — Rider-side hook for multi-driver matching lifecycle.
 * Creates ride request → listens for assignment via Realtime → auto-expires.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRideRequest } from "@/lib/rides/create-ride-request";
import { expireRideRequest } from "@/lib/rides/expire-ride-request";

export type RideSearchState = "idle" | "searching" | "assigned" | "expired" | "error";

export function useMultiDriverRide() {
  const [state, setState] = useState<RideSearchState>("idle");
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const expireTimerRef = useRef<number | null>(null);

  // Listen for ride request updates (assignment or expiry)
  useEffect(() => {
    if (!rideRequestId) return;

    const channel = supabase
      .channel(`ride-request:${rideRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_requests",
          filter: `id=eq.${rideRequestId}`,
        },
        (payload) => {
          const next = payload.new as any;
          if (next.status === "assigned") {
            setAssignedDriverId(next.selected_driver_id ?? null);
            setState("assigned");
            if (expireTimerRef.current) window.clearTimeout(expireTimerRef.current);
          }
          if (next.status === "expired") {
            setState("expired");
            if (expireTimerRef.current) window.clearTimeout(expireTimerRef.current);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideRequestId]);

  const startSearch = useCallback(async (params: {
    riderId: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat?: number;
    dropoffLng?: number;
    drivers: Array<{ id: string; lat: number; lng: number; status: "available" | "busy"; type: "taxi" | "delivery"; rating: number }>;
  }) => {
    setState("searching");
    try {
      const { rideRequest } = await createRideRequest(params);
      setRideRequestId(rideRequest.id);

      // Auto-expire after 20s
      expireTimerRef.current = window.setTimeout(async () => {
        try {
          await expireRideRequest(rideRequest.id);
        } catch { /* already expired/assigned */ }
      }, 20_000);
    } catch {
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setRideRequestId(null);
    setAssignedDriverId(null);
    if (expireTimerRef.current) window.clearTimeout(expireTimerRef.current);
  }, []);

  return { state, rideRequestId, assignedDriverId, startSearch, reset };
}
