import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

export interface TripLivePosition {
  job_id: string;
  rider_user_id?: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  updated_at?: string | null;
}

export function useTripLiveTracking(jobId: string | null) {
  const [position, setPosition] = useState<TripLivePosition | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (!jobId) {
      setPosition(null);
      setLastUpdate(0);
      return;
    }

    let mounted = true;

    const bootstrap = async () => {
      const { data } = await supabase
        .from("trip_live_state")
        .select("job_id,rider_user_id,lat,lng,heading,speed,updated_at")
        .eq("job_id", jobId)
        .maybeSingle();

      if (!mounted) return;
      if (data) {
        setPosition(data as TripLivePosition);
        setLastUpdate(Date.now());
      }
    };

    void bootstrap();

    const channel = supabase
      .channel(`trip-live-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_live_state",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          if (!mounted) return;
          const next = payload.new as TripLivePosition;
          setPosition(next);
          setLastUpdate(Date.now());
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void removeRealtimeChannel(channel);
    };
  }, [jobId]);

  return { position, lastUpdate };
}
