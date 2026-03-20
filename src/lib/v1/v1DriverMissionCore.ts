import { supabase } from "@/integrations/supabase/client";
import { advanceMissionStatus, submitMissionProof } from "@/lib/v1/ridePackageFlow";

export async function getDriverOpenMissions(driverUserId: string) {
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("driver_id", driverUserId)
    .in("status", ["driver_assigned", "picked_up", "on_the_way"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}

export { advanceMissionStatus, submitMissionProof };
