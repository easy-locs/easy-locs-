/**
 * useDriverActiveMission — Realtime hook for the driver's current active dispatch job.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["assigned", "accepted", "driver_arriving_pickup", "picked_up", "in_progress"];

export function useDriverActiveMission(driverProfileId: string | null) {
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!driverProfileId) return;
    const { data } = await (supabase as any)
      .from("dispatch_jobs_v2")
      .select("*")
      .eq("assigned_driver_id", driverProfileId)
      .in("dispatch_status", ACTIVE_STATUSES)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setJob(data ?? null);
    setLoading(false);
  }, [driverProfileId]);

  useEffect(() => {
    if (!driverProfileId) return;
    load();
    const ch = supabase
      .channel(`driver-active-job:${driverProfileId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "dispatch_jobs_v2",
        filter: `assigned_driver_id=eq.${driverProfileId}`,
      }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driverProfileId, load]);

  return { job, loading, reload: load };
}
