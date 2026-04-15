/**
 * ride-live-route-engine — Computes live route geometry + ETA + traffic for active rides.
 * Reads mobility_jobs + trip_live_state, calls Mapbox directions for polyline.
 */
import { db } from "@/services/db";
import { getDirections } from "@/lib/location/geocode";
import { computeSmartETA } from "@/lib/mobility/smart-eta-engine";
import type { SmartTrafficLevel, SmartWeatherImpact } from "@/lib/mobility/smart-eta-engine";
import { recordETAPrediction } from "@/lib/mobility/eta-accuracy-tracker";

export type RideTrafficLevel = "low" | "moderate" | "heavy" | "gridlock" | "unknown";

export interface RideLiveRoute {
  jobId: string;
  jobStatus: string;
  driver: { lat: number; lng: number } | null;
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  activeDestination: { lat: number; lng: number } | null;
  routeGeometry: any | null;
  trafficLevel: RideTrafficLevel;
  etaMinutes: number | null;
  etaRangeMin: number | null;
  etaRangeMax: number | null;
  weatherImpact: SmartWeatherImpact;
  badge: string | null;
  distanceKm: number | null;
  staleSeconds: number | null;
  hasLiveDriver: boolean;
  updatedAt: string;
}

function inferTrafficLevel(durationSec: number, distanceMeters: number): RideTrafficLevel {
  if (!durationSec || !distanceMeters) return "unknown";
  const km = distanceMeters / 1000;
  const h = durationSec / 3600;
  const speed = km / Math.max(h, 0.0001);
  if (speed >= 35) return "low";
  if (speed >= 22) return "moderate";
  return "heavy";
}

function getStaleSeconds(updatedAt?: string | null): number | null {
  if (!updatedAt) return null;
  return Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000));
}

function isPrePickup(status: string): boolean {
  return ["accepted", "rider_arriving_pickup", "rider_arrived_pickup"].includes(status);
}

function isInTrip(status: string): boolean {
  return ["picked_up", "in_progress", "rider_arriving_dropoff"].includes(status);
}

function makeFallback(
  jobId: string, jobStatus: string,
  driver: RideLiveRoute["driver"], pickup: RideLiveRoute["pickup"],
  dropoff: RideLiveRoute["dropoff"], activeDestination: RideLiveRoute["activeDestination"],
  staleSeconds: number | null,
): RideLiveRoute {
  return {
    jobId, jobStatus, driver, pickup, dropoff, activeDestination,
    routeGeometry: null, trafficLevel: "unknown",
    etaMinutes: null, etaRangeMin: null, etaRangeMax: null,
    weatherImpact: "none", badge: null,
    distanceKm: null,
    staleSeconds, hasLiveDriver: !!driver,
    updatedAt: new Date().toISOString(),
  };
}

export async function computeRideLiveRoute(jobId: string): Promise<RideLiveRoute | null> {
  const [{ data: job }, { data: live }] = await Promise.all([
    db("mobility_jobs")
      .select("id,status,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng")
      .eq("id", jobId)
      .maybeSingle(),
    db("trip_live_state")
      .select("job_id,lat,lng,updated_at")
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);

  if (!job?.id || !job?.status) return null;

  const pickup =
    job.pickup_lat != null && job.pickup_lng != null
      ? { lat: Number(job.pickup_lat), lng: Number(job.pickup_lng) }
      : null;

  const dropoff =
    job.dropoff_lat != null && job.dropoff_lng != null
      ? { lat: Number(job.dropoff_lat), lng: Number(job.dropoff_lng) }
      : null;

  const driver =
    live?.lat != null && live?.lng != null
      ? { lat: Number(live.lat), lng: Number(live.lng) }
      : null;

  const staleSeconds = getStaleSeconds(live?.updated_at);

  const activeDestination =
    isPrePickup(job.status) ? pickup
    : isInTrip(job.status) ? dropoff
    : null;

  if (!activeDestination) {
    return makeFallback(job.id, job.status, driver, pickup, dropoff, null, staleSeconds);
  }

  const origin = driver ?? pickup;
  if (!origin) {
    return makeFallback(job.id, job.status, null, pickup, dropoff, activeDestination, staleSeconds);
  }

  let directions: Awaited<ReturnType<typeof getDirections>> = null;
  let smartEta: Awaited<ReturnType<typeof computeSmartETA>> | null = null;

  try {
    [directions, smartEta] = await Promise.all([
      getDirections(origin, activeDestination).catch(() => null),
      computeSmartETA(origin, activeDestination, { skipDriverCount: true }).catch(() => null),
    ]);
  } catch { /* both failed */ }

  if (!directions && !smartEta) {
    return makeFallback(job.id, job.status, driver, pickup, dropoff, activeDestination, staleSeconds);
  }

  const etaMinutes = smartEta?.etaMinutes ?? (directions ? Math.max(1, Math.round(directions.duration_s / 60)) : null);
  const distanceKm = smartEta?.distanceKm ?? (directions ? Number((directions.distance_m / 1000).toFixed(1)) : null);
  const trafficLevel = smartEta?.trafficLevel as RideTrafficLevel ?? inferTrafficLevel(directions?.duration_s ?? 0, directions?.distance_m ?? 0);

  const result: RideLiveRoute = {
    jobId: job.id,
    jobStatus: job.status,
    driver, pickup, dropoff, activeDestination,
    routeGeometry: directions?.geometry ?? null,
    trafficLevel,
    etaMinutes,
    etaRangeMin: smartEta?.etaRangeMin ?? null,
    etaRangeMax: smartEta?.etaRangeMax ?? null,
    weatherImpact: smartEta?.weatherImpact ?? "none",
    badge: smartEta?.badge ?? null,
    distanceKm,
    staleSeconds,
    hasLiveDriver: !!driver,
    updatedAt: new Date().toISOString(),
  };

  if (smartEta) {
    void recordETAPrediction({
      job_id: job.id,
      prediction_type: "live_update",
      predicted_eta_minutes: smartEta.etaMinutes,
      predicted_range_min: smartEta.etaRangeMin,
      predicted_range_max: smartEta.etaRangeMax,
      traffic_level: smartEta.trafficLevel,
      weather_impact: smartEta.weatherImpact,
      rush_hour_multiplier: smartEta.rushHourMultiplier,
      confidence_score: smartEta.confidenceScore,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_lat: activeDestination.lat,
      destination_lng: activeDestination.lng,
    }).catch((e) => { console.warn("[ETA_TRACKING] Failed to record live prediction:", e); });
  }

  return result;
}
