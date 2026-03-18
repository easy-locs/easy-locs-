/**
 * useRideRequestLive — Real-time listener for ride request status, wave, and driver assignment.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRideRequestLive(rideRequestId: string | null) {
  const [status, setStatus] = useState<string>("idle");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [currentWave, setCurrentWave] = useState<number>(0);

  useEffect(() => {
    if (!rideRequestId) return;

    const channel = supabase
      .channel(`ride-live:${rideRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_requests",
          filter: `id=eq.${rideRequestId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setStatus(row.status ?? "idle");
          setSelectedDriverId(row.selected_driver_id ?? null);
          setCurrentWave(row.current_wave ?? 0);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideRequestId]);

  return { status, selectedDriverId, currentWave };
}
