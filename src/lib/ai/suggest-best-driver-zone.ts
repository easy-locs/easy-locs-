/**
 * suggest-best-driver-zone — AI-powered zone recommendation combining demand + cluster data.
 */
import { supabase } from "@/integrations/supabase/client";

export async function suggestBestDriverZone(driverId: string) {
  const { data: zones } = await supabase
    .from("demand_zones" as any)
    .select("*")
    .order("surge_multiplier", { ascending: false })
    .limit(10);

  const { data: clusters } = await supabase
    .from("driver_clusters" as any)
    .select("*");

  if (!zones?.length) return null;

  const enriched = (zones as any[]).map((zone: any) => {
    const cluster = ((clusters ?? []) as any[]).find((c: any) => c.zone_key === zone.zone_key);
    const driverCount = cluster?.driver_count ?? 0;
    const score =
      Number(zone.predicted_demand || 0) * 0.5 +
      Number(zone.surge_multiplier || 1) * 20 -
      driverCount * 3;

    return { ...zone, score };
  });

  enriched.sort((a: any, b: any) => b.score - a.score);
  const best = enriched[0];
  if (!best) return null;

  await supabase.from("driver_positioning" as any).insert({
    driver_id: driverId,
    suggested_lat: best.center_lat,
    suggested_lng: best.center_lng,
    demand_score: best.predicted_demand ?? best.demand_score ?? 0,
    reason: "ai_best_zone_v2",
  } as any);

  return best;
}
