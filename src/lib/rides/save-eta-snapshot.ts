/**
 * save-eta-snapshot — Persist ETA measurement for analytics.
 */
import { supabase } from "@/integrations/supabase/client";

export async function saveETASnapshot(params: {
  rideRequestId: string;
  driverId?: string | null;
  etaMinutes: number;
  distanceKm: number;
  trafficFactor?: number;
}) {
  const { error } = await supabase
    .from("ride_eta_snapshots" as any)
    .insert({
      ride_request_id: params.rideRequestId,
      driver_id: params.driverId ?? null,
      eta_minutes: params.etaMinutes,
      distance_km: params.distanceKm,
      traffic_factor: params.trafficFactor ?? 1,
    } as any);

  if (error) throw error;
  return { ok: true };
}
