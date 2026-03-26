/**
 * driver-ai-scorer — Multi-dimensional driver scoring for intelligent dispatch.
 */
import { supabase } from "@/integrations/supabase/client";

type DriverCandidate = {
  user_id: string;
  lat: number;
  lng: number;
  is_online: boolean;
  is_available: boolean;
  vehicle_type?: string | null;
  zone_key?: string | null;
};

type JobInput = {
  jobId: string;
  pickupLat: number;
  pickupLng: number;
  serviceLevel?: string | null;
  zoneKey?: string | null;
};

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

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function vehicleFit(serviceLevel?: string | null, vehicleType?: string | null): number {
  if (!serviceLevel) return 0.7;
  if (!vehicleType) return 0.5;

  const s = serviceLevel.toLowerCase();
  const v = vehicleType.toLowerCase();

  if (s.includes("premium") && v.includes("premium")) return 1;
  if (s.includes("xl") && (v.includes("xl") || v.includes("suv"))) return 1;
  if (s.includes("taxi_standard")) return 0.9;
  return 0.7;
}

export interface ScoredDriver {
  rider_user_id: string;
  distance_km: number;
  score_total: number;
  score_distance: number;
  score_acceptance: number;
  score_response: number;
  score_reliability: number;
  score_zone: number;
  score_activity: number;
  score_vehicle_fit: number;
  score_gps_quality: number;
  rank_index: number;
  explanation_json: Record<string, any>;
}

export async function scoreDriversForJob(input: JobInput): Promise<ScoredDriver[]> {
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

  const scored = (drivers as unknown as DriverCandidate[])
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => {
      const distKm = haversineKm(input.pickupLat, input.pickupLng, d.lat, d.lng);
      const stats = statsMap.get(d.user_id);

      const scoreDistance = clamp01(1 - distKm / 8);
      const scoreAcceptance = clamp01((stats?.acceptance_rate ?? 60) / 100);
      const scoreResponse = clamp01(1 - (stats?.avg_response_seconds ?? 25) / 90);
      const scoreReliability = clamp01(
        (stats?.avg_trip_completion_rate ?? 85) / 100 -
          (stats?.cancellation_rate ?? 5) / 200,
      );
      const scoreZone = input.zoneKey && d.zone_key === input.zoneKey ? 1 : 0.6;
      const scoreActivity = 0.75;
      const scoreVehicleFit = vehicleFit(input.serviceLevel, d.vehicle_type);
      const scoreGpsQuality = clamp01((stats?.gps_reliability_score ?? 70) / 100);

      const scoreTotal =
        scoreDistance * 0.28 +
        scoreAcceptance * 0.14 +
        scoreResponse * 0.12 +
        scoreReliability * 0.16 +
        scoreZone * 0.08 +
        scoreActivity * 0.06 +
        scoreVehicleFit * 0.08 +
        scoreGpsQuality * 0.08;

      return {
        rider_user_id: d.user_id,
        distance_km: distKm,
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
          distance_km: Number(distKm.toFixed(2)),
          vehicle_type: d.vehicle_type ?? null,
          zone_match: !!(input.zoneKey && d.zone_key === input.zoneKey),
        },
      };
    })
    .sort((a, b) => b.score_total - a.score_total)
    .map((row, index) => ({ ...row, rank_index: index + 1 }));

  // Persist scores
  if (scored.length) {
    await supabase.from("mobility_driver_scores").insert(
      scored.map((s) => ({
        job_id: input.jobId,
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
      })) as any,
    );
  }

  return scored;
}
