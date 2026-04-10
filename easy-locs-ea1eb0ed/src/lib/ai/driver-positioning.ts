/**
 * driver-positioning — Suggest best zone for driver repositioning.
 */
import { supabase } from "@/integrations/supabase/client";

export async function suggestDriverPosition(driverId: string) {
  const { data: zones } = await supabase
    .from("demand_zones" as any)
    .select("*")
    .order("surge_multiplier", { ascending: false })
    .limit(3);

  if (!zones?.length) return null;

  const bestZone = (zones as any[])[0];

  await supabase.from("driver_positioning" as any).insert({
    driver_id: driverId,
    suggested_lat: bestZone.center_lat,
    suggested_lng: bestZone.center_lng,
    demand_score: bestZone.demand_score,
    reason: "high_demand_zone",
  } as any);

  return bestZone;
}
