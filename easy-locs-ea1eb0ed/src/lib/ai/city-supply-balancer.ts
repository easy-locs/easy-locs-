/**
 * city-supply-balancer — Detect supply gaps and log rebalance needs.
 */
import { supabase } from "@/integrations/supabase/client";

export async function runCitySupplyBalancer(params: {
  city?: string;
}) {
  const { data: zones } = await supabase
    .from("demand_zones" as any)
    .select("*")
    .order("predicted_demand", { ascending: false });

  const { data: clusters } = await supabase
    .from("driver_clusters" as any)
    .select("*");

  const hotZones = ((zones ?? []) as any[])
    .map((zone: any) => {
      const cluster = ((clusters ?? []) as any[]).find((c: any) => c.zone_key === zone.zone_key);
      const currentDriverCount = Number(cluster?.driver_count || 0);
      const predictedDemand = Number(zone.predicted_demand || zone.active_requests || 0);
      const targetDriverCount = Math.ceil(predictedDemand * 0.8);
      const gap = targetDriverCount - currentDriverCount;

      return { ...zone, currentDriverCount, targetDriverCount, gap };
    })
    .filter((zone: any) => zone.gap > 0)
    .sort((a: any, b: any) => b.gap - a.gap);

  for (const zone of hotZones.slice(0, 10)) {
    await supabase.from("city_supply_balancer_logs" as any).insert({
      city: params.city ?? zone.city ?? null,
      zone_key: zone.zone_key,
      action_type: "rebalance_needed",
      target_driver_count: zone.targetDriverCount,
      current_driver_count: zone.currentDriverCount,
      suggested_driver_ids: [],
      metadata_json: {
        predicted_demand: zone.predicted_demand,
        surge_multiplier: zone.surge_multiplier,
        gap: zone.gap,
      },
    } as any);
  }

  return { ok: true, hotZones };
}
