/**
 * Live ETA Computer — computes dynamic ETA using Smart ETA engine
 * with driver position, job coordinates, traffic, weather, and rush hour.
 *
 * Brain owner: Execution Brain
 * Sources: trip_live_state, mobility_jobs, Smart ETA engine
 *
 * Emits:
 * - ride.eta.updated
 */
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { computeSmartETA } from "./smart-eta-engine";

export interface LiveETA {
  jobId: string;
  etaPickupMinutes: number | null;
  etaDestinationMinutes: number | null;
  distancePickupKm: number | null;
  distanceDestinationKm: number | null;
  trafficLevel: string;
  weatherImpact: string;
  badge: string | null;
  etaRangeMin: number | null;
  etaRangeMax: number | null;
  updatedAt: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ROAD_FACTOR = 1.35;

export async function computeLiveETA(jobId: string): Promise<LiveETA | null> {
  const { data: liveState } = await db
    .from("trip_live_state")
    .select("lat, lng, speed, heading, updated_at")
    .eq("job_id", jobId)
    .maybeSingle();

  if (liveState?.lat == null || liveState?.lng == null) return null;

  const { data: job } = await db
    .from("mobility_jobs")
    .select("pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return null;

  let etaPickupMinutes: number | null = null;
  let distancePickupKm: number | null = null;
  let etaDestinationMinutes: number | null = null;
  let distanceDestinationKm: number | null = null;
  let trafficLevel = "unknown";
  let weatherImpact = "none";
  let badge: string | null = null;
  let etaRangeMin: number | null = null;
  let etaRangeMax: number | null = null;

  const isPrePickup = ["accepted", "rider_arriving_pickup", "searching", "offered"].includes(job.status);
  const isPostPickup = ["picked_up", "in_progress", "rider_arriving_dropoff", "rider_arrived_pickup"].includes(job.status);

  if (isPrePickup && job.pickup_lat != null && job.pickup_lng != null) {
    try {
      const smartResult = await computeSmartETA(
        { lat: liveState.lat, lng: liveState.lng },
        { lat: job.pickup_lat, lng: job.pickup_lng },
        { skipDriverCount: true },
      );
      etaPickupMinutes = smartResult.etaMinutes;
      distancePickupKm = smartResult.distanceKm;
      trafficLevel = smartResult.trafficLevel;
      weatherImpact = smartResult.weatherImpact;
      badge = smartResult.badge;
      etaRangeMin = smartResult.etaRangeMin;
      etaRangeMax = smartResult.etaRangeMax;
    } catch {
      distancePickupKm = haversineKm(liveState.lat, liveState.lng, job.pickup_lat, job.pickup_lng) * ROAD_FACTOR;
      etaPickupMinutes = Math.max(1, Math.round((distancePickupKm / 30) * 60));
    }
  }

  if (job.dropoff_lat != null && job.dropoff_lng != null) {
    if (isPostPickup) {
      try {
        const smartResult = await computeSmartETA(
          { lat: liveState.lat, lng: liveState.lng },
          { lat: job.dropoff_lat, lng: job.dropoff_lng },
          { skipDriverCount: true },
        );
        etaDestinationMinutes = smartResult.etaMinutes;
        distanceDestinationKm = smartResult.distanceKm;
        trafficLevel = smartResult.trafficLevel;
        weatherImpact = smartResult.weatherImpact;
        badge = smartResult.badge;
        etaRangeMin = smartResult.etaRangeMin;
        etaRangeMax = smartResult.etaRangeMax;
      } catch {
        distanceDestinationKm = haversineKm(liveState.lat, liveState.lng, job.dropoff_lat, job.dropoff_lng) * ROAD_FACTOR;
        etaDestinationMinutes = Math.max(1, Math.round((distanceDestinationKm / 30) * 60));
      }
    } else if (isPrePickup && job.pickup_lat != null && job.pickup_lng != null) {
      try {
        const smartResult = await computeSmartETA(
          { lat: job.pickup_lat, lng: job.pickup_lng },
          { lat: job.dropoff_lat, lng: job.dropoff_lng },
          { skipDriverCount: true, skipWeather: true },
        );
        etaDestinationMinutes = smartResult.etaMinutes;
        distanceDestinationKm = smartResult.distanceKm;
      } catch {
        distanceDestinationKm = haversineKm(job.pickup_lat, job.pickup_lng, job.dropoff_lat, job.dropoff_lng) * ROAD_FACTOR;
        etaDestinationMinutes = Math.max(1, Math.round((distanceDestinationKm / 30) * 60));
      }
    }
  }

  const result: LiveETA = {
    jobId,
    etaPickupMinutes,
    etaDestinationMinutes,
    distancePickupKm: distancePickupKm ? Math.round(distancePickupKm * 10) / 10 : null,
    distanceDestinationKm: distanceDestinationKm ? Math.round(distanceDestinationKm * 10) / 10 : null,
    trafficLevel,
    weatherImpact,
    badge,
    etaRangeMin,
    etaRangeMax,
    updatedAt: new Date().toISOString(),
  };

  platformBus.emit("ride:eta_updated", result, "system");

  return result;
}
