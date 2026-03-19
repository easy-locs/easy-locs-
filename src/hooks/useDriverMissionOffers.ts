/**
 * useDriverMissionOffers — Realtime hook for driver's pending mission offers.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDriverMissionOffers(driverProfileId: string | null) {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!driverProfileId) return;
    const { data } = await (supabase as any)
      .from("driver_mission_offers")
      .select("*, dispatch_jobs_v2(*)")
      .eq("driver_profile_id", driverProfileId)
      .in("offer_status", ["sent"])
      .order("created_at", { ascending: false });
    setOffers(data ?? []);
    setLoading(false);
  }, [driverProfileId]);

  useEffect(() => {
    if (!driverProfileId) return;
    load();

    const ch = supabase
      .channel(`driver-offers-rt:${driverProfileId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "driver_mission_offers",
        filter: `driver_profile_id=eq.${driverProfileId}`,
      }, load)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [driverProfileId, load]);

  return { offers, loading, reload: load };
}
