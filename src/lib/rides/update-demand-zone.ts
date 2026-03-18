/**
 * update-demand-zone — Upsert demand zone with predicted demand + AI surge.
 */
import { supabase } from "@/integrations/supabase/client";
import { toZoneKey, roundCoord } from "@/lib/geo/zone-utils";
import { predictDemand } from "@/lib/rides/predict-demand";
import { computeAISurge } from "@/lib/rides/ai-surge";
import { alertHotZone } from "@/lib/admin/alert-policies";

export async function updateDemandZone(params: {
  lat: number;
  lng: number;
  activeRequests: number;
  activeDrivers: number;
  city?: string;
}) {
  const { lat, lng, activeRequests, activeDrivers, city } = params;
  const zoneKey = toZoneKey(lat, lng, 2);
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  const predictedDemand = predictDemand({
    currentDemand: activeRequests,
    hour,
    dayOfWeek,
    recentCompletions: 0,
  });

  const surge = computeAISurge({
    demand: activeRequests,
    supply: activeDrivers,
    predictedDemand,
    peakHour: (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 21),
  });

  const payload = {
    zone_key: zoneKey,
    city: city ?? null,
    center_lat: roundCoord(lat, 2),
    center_lng: roundCoord(lng, 2),
    demand_score: activeRequests,
    supply_score: activeDrivers,
    active_requests: activeRequests,
    active_drivers: activeDrivers,
    predicted_demand: predictedDemand,
    surge_multiplier: surge,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("demand_zones" as any)
    .upsert(payload as any, { onConflict: "zone_key" } as any);

  if (error) throw error;

  return { ok: true, zoneKey, predictedDemand, surge };
}
