/**
 * ride-live-route-engine — Computes live route geometry + ETA + traffic for active rides.
 * Reads mobility_jobs + trip_live_state, calls Mapbox directions for polyline.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDirections } from "@/lib/location/geocode";

export interface RideLiveRoute {
  jobId: string;
  origin: { lat: number; lng: number } | null;
  driver: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  routeGeometry: any | null;
  trafficLevel: "low" | "moderate" | "heavy" | "unknown";
  etaMinutes: number | null;
  distanceKm: number | null;
  updatedAt: string;
}

function inferTrafficLevel(durationSec: number, distanceMeters: number): RideLiveRoute["trafficLevel"] {
  if (!distanceMeters) return "unknown";
  const km = distanceMeters / 1000;
  const h = durationSec / 3600;
  const speed = km / Math.max(h, 0.0001);

  if (speed >= 35) return "low";
  if (speed >= 22) return "moderate";
  return "heavy";
}

export async function computeRideLiveRoute(jobId: string): Promise<RideLiveRoute | null> {
  const [{ data: job }, { data: live }] = await Promise.all([
    supabase
      .from("mobility_jobs")
      .select("id,status,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng")
      .eq("id", jobId)
      .maybeSingle(),
    supabase
      .from("trip_live_state")
      .select("job_id,lat,lng")
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);

  if (!job) return null;

  const driver =
    live?.lat != null && live?.lng != null
      ? { lat: Number(live.lat), lng: Number(live.lng) }
      : null;

  const prePickup = ["accepted", "rider_arriving_pickup", "rider_arrived_pickup"].includes(job.status);
  const inTrip = ["picked_up", "in_progress", "rider_arriving_dropoff"].includes(job.status);

  const origin =
    driver ??
    (job.pickup_lat != null && job.pickup_lng != null
      ? { lat: Number(job.pickup_lat), lng: Number(job.pickup_lng) }
      : null);

  const destination =
    prePickup && job.pickup_lat != null && job.pickup_lng != null
      ? { lat: Number(job.pickup_lat), lng: Number(job.pickup_lng) }
      : inTrip && job.dropoff_lat != null && job.dropoff_lng != null
        ? { lat: Number(job.dropoff_lat), lng: Number(job.dropoff_lng) }
        : null;

  const fallback: RideLiveRoute = {
    jobId,
    origin,
    driver,
    destination,
    routeGeometry: null,
    trafficLevel: "unknown",
    etaMinutes: null,
    distanceKm: null,
    updatedAt: new Date().toISOString(),
  };

  if (!origin || !destination) return fallback;

  try {
    const directions = await getDirections(origin, destination);
    if (!directions) return fallback;

    return {
      jobId,
      origin,
      driver,
      destination,
      routeGeometry: directions.geometry ?? null,
      trafficLevel: inferTrafficLevel(directions.duration_s, directions.distance_m),
      etaMinutes: Math.max(1, Math.round(directions.duration_s / 60)),
      distanceKm: Number((directions.distance_m / 1000).toFixed(1)),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}
