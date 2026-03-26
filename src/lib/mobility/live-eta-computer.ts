/**
 * Live ETA Computer — computes dynamic ETA using driver position,
 * job coordinates, and traffic factors from zone overlays.
 *
 * Brain owner: Execution Brain
 * Sources: trip_live_state, mobility_jobs, geo_live_zone_overlays
 *
 * Emits:
 * - ride.eta.updated
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

export interface LiveETA {
  jobId: string;
  etaPickupMinutes: number | null;
  etaDestinationMinutes: number | null;
  distancePickupKm: number | null;
  distanceDestinationKm: number | null;
  trafficLevel: string;
  updatedAt: string;
}

// Average speed assumptions (km/h) by traffic level
const SPEED_BY_TRAFFIC: Record<string, number> = {
  free: 45,
  light: 35,
  moderate: 25,
  heavy: 15,
  severe: 8,
};

const DEFAULT_SPEED_KMH = 30;

/** Haversine distance in km */
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

/** Road distance factor (straight-line → approximate road distance) */
const ROAD_FACTOR = 1.35;

/**
 * Compute live ETA for a given job.
 * Returns null if insufficient data.
 */
export async function computeLiveETA(jobId: string): Promise<LiveETA | null> {
  // 1. Get driver's current position from trip_live_state
  const { data: liveState } = await supabase
    .from("trip_live_state")
    .select("lat, lng, speed, heading, updated_at")
    .eq("job_id", jobId)
    .maybeSingle();

  if (!liveState?.lat || !liveState?.lng) return null;

  // 2. Get job coordinates
  const { data: job } = await (supabase as any)
    .from("mobility_jobs")
    .select("pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status, zone_key")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return null;

  // 3. Get traffic factor from zone overlay
  let trafficLevel = "moderate";
  if (job.zone_key) {
    const { data: overlay } = await supabase
      .from("geo_live_zone_overlays")
      .select("traffic_level, traffic_speed_factor")
      .eq("zone_key", job.zone_key as string)
      .maybeSingle();

    if (overlay?.traffic_level) {
      trafficLevel = overlay.traffic_level;
    }
  }

  const speedKmh = SPEED_BY_TRAFFIC[trafficLevel] ?? DEFAULT_SPEED_KMH;

  // 4. Compute distances and ETAs
  let etaPickupMinutes: number | null = null;
  let distancePickupKm: number | null = null;
  let etaDestinationMinutes: number | null = null;
  let distanceDestinationKm: number | null = null;

  const isPrePickup = ["accepted", "rider_arriving_pickup", "searching", "offered"].includes(job.status);
  const isPostPickup = ["picked_up", "in_progress", "rider_arriving_dropoff", "rider_arrived_pickup"].includes(job.status);

  if (isPrePickup && job.pickup_lat && job.pickup_lng) {
    distancePickupKm = haversineKm(liveState.lat, liveState.lng, job.pickup_lat, job.pickup_lng) * ROAD_FACTOR;
    etaPickupMinutes = Math.max(1, Math.round((distancePickupKm / speedKmh) * 60));
  }

  if (job.dropoff_lat && job.dropoff_lng) {
    if (isPostPickup) {
      // Driver → destination
      distanceDestinationKm = haversineKm(liveState.lat, liveState.lng, job.dropoff_lat, job.dropoff_lng) * ROAD_FACTOR;
      etaDestinationMinutes = Math.max(1, Math.round((distanceDestinationKm / speedKmh) * 60));
    } else if (isPrePickup && job.pickup_lat && job.pickup_lng) {
      // Pickup → destination (estimated total trip)
      distanceDestinationKm = haversineKm(job.pickup_lat, job.pickup_lng, job.dropoff_lat, job.dropoff_lng) * ROAD_FACTOR;
      etaDestinationMinutes = Math.max(1, Math.round((distanceDestinationKm / speedKmh) * 60));
    }
  }

  const result: LiveETA = {
    jobId,
    etaPickupMinutes,
    etaDestinationMinutes,
    distancePickupKm: distancePickupKm ? Math.round(distancePickupKm * 10) / 10 : null,
    distanceDestinationKm: distanceDestinationKm ? Math.round(distanceDestinationKm * 10) / 10 : null,
    trafficLevel,
    updatedAt: new Date().toISOString(),
  };

  // Emit event
  void eventBus.emit("ride.eta.updated", result);

  return result;
}
