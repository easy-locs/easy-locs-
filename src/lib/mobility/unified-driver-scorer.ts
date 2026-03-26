/**
 * Unified Driver Scorer — single scoring core for all mobility contexts.
 */
import { supabase } from "@/integrations/supabase/client";
import { getMobilityProfile } from "./mobility-profiles";
import type {
  UnifiedDriverScore,
  UnifiedMobilityJobInput,
} from "./unified-mobility.types";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function vehicleFit(
  context: string,
  vehicleType?: string | null,
  packageSize?: string | null,
) {
  const v = vehicleType?.toLowerCase() ?? "";

  if (context === "taxi") {
    if (v.includes("premium")) return 0.95;
    if (v.includes("sedan") || v.includes("taxi")) return 0.9;
    return 0.75;
  }

  if (context === "food_delivery" || context === "grocery_delivery") {
    if (v.includes("bike") || v.includes("scooter")) return 0.9;
    if (v.includes("car")) return 0.8;
    return 0.7;
  }

  if (context === "parcel" || context === "errand") {
    if (packageSize === "large" && (v.includes("van") || v.includes("suv"))) return 1;
    if (packageSize === "medium" && (v.includes("car") || v.includes("suv"))) return 0.9;
    return 0.75;
  }

  return 0.75;
}

export async function scoreUnifiedDrivers(params: {
  jobId: string;
  job: UnifiedMobilityJobInput;
}): Promise<UnifiedDriverScore[]> {
  const profile = getMobilityProfile(params.job.context);

  const { data: drivers } = await supabase
    .from("rider_presence")
    .select("user_id, lat, lng, is_online, is_available, vehicle_type, zone_key")
    .eq("is_online", true)
    .eq("is_available", true)
    .limit(100);

  if (!drivers?.length) return [];

  const { data: statsRows } = await supabase
    .from("mobility_driver_stats")
    .select("*")
    .in(
      "rider_user_id",
      drivers.map((d: any) => d.user_id),
    );

  const statsMap = new Map<string, any>(
    (statsRows ?? []).map((s: any) => [s.rider_user_id, s]),
  );

  const scored = (drivers as any[])
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => {
      const stats = statsMap.get(d.user_id);
      const distKm = haversineKm(
        params.job.pickup.lat,
        params.job.pickup.lng,
        Number(d.lat),
        Number(d.lng),
      );

      const scoreDistance = clamp01(1 - distKm / 8);
      const scoreAcceptance = clamp01((stats?.acceptance_rate ?? 60) / 100);
      const scoreResponse = clamp01(1 - (stats?.avg_response_seconds ?? 25) / 90);
      const scoreReliability = clamp01(
        (stats?.avg_trip_completion_rate ?? 85) / 100 -
          (stats?.cancellation_rate ?? 5) / 200,
      );
      const scoreZone =
        params.job.zone?.zoneKey && d.zone_key === params.job.zone.zoneKey
          ? 1
          : 0.6;
      const scoreActivity = 0.75;
      const scoreVehicleFit = vehicleFit(
        params.job.context,
        d.vehicle_type,
        params.job.packageSize ?? null,
      );
      const scoreGpsQuality = clamp01((stats?.gps_reliability_score ?? 70) / 100);

      const scoreTotal =
        scoreDistance * profile.weightDistance +
        scoreAcceptance * profile.weightAcceptance +
        scoreResponse * profile.weightResponse +
        scoreReliability * profile.weightReliability +
        scoreZone * profile.weightZone +
        scoreActivity * profile.weightActivity +
        scoreVehicleFit * profile.weightVehicleFit +
        scoreGpsQuality * profile.weightGpsQuality;

      return {
        rider_user_id: d.user_id,
        distance_km: Number(distKm.toFixed(2)),
        score_total: Number(scoreTotal.toFixed(4)),
        score_distance: scoreDistance,
        score_acceptance: scoreAcceptance,
        score_response: scoreResponse,
        score_reliability: scoreReliability,
        score_zone: scoreZone,
        score_activity: scoreActivity,
        score_vehicle_fit: scoreVehicleFit,
        score_gps_quality: scoreGpsQuality,
        rank_index: 0,
        explanation_json: {
          context: params.job.context,
          zone_match:
            params.job.zone?.zoneKey && d.zone_key === params.job.zone.zoneKey,
          vehicle_type: d.vehicle_type ?? null,
        },
      } satisfies UnifiedDriverScore;
    })
    .sort((a, b) => b.score_total - a.score_total)
    .map((row, index) => ({ ...row, rank_index: index + 1 }));

  // Persist scores
  if (scored.length > 0) {
    await supabase.from("mobility_driver_scores").insert(
      scored.map((s) => ({
        job_id: params.jobId,
        rider_user_id: s.rider_user_id,
        score_total: s.score_total,
        score_distance: s.score_distance,
        score_acceptance: s.score_acceptance,
        score_response: s.score_response,
        score_reliability: s.score_reliability,
        score_zone: s.score_zone,
        score_activity: s.score_activity,
        score_vehicle_fit: s.score_vehicle_fit,
        score_gps_quality: s.score_gps_quality,
        rank_index: s.rank_index,
        explanation_json: s.explanation_json,
      })),
    );
  }

  return scored;
}
