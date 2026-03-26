import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTripLiveTracking(jobId: string | null) {
  const [position, setPosition] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (!jobId) return;

    // Fetch initial state
    supabase
      .from("trip_live_state")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPosition(data);
          setLastUpdate(Date.now());
        }
      });

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
          setPosition(payload.new);
          setLastUpdate(Date.now());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return { position, lastUpdate };
}
