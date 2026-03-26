/**
 * load-ride-preview.ts — Canonical ride preview engine.
 * Computes ETA, fare estimate, nearby drivers, traffic & surge
 * BEFORE the user submits a ride request.
 *
 * Sources: Mapbox directions, rider_presence, geo_live_zone_overlays
 * No side effects — pure read + compute.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDirections } from "@/lib/location/geocode";

export type TrafficLevel = "low" | "moderate" | "heavy" | "unknown";

export interface RidePreviewData {
  ready: boolean;
  waitMinutes: number | null;
  etaMinutes: number | null;
  distanceKm: number | null;
  estimatedFare: number | null;
  trafficLevel: TrafficLevel;
  zoneKey: string | null;
  nearbyDrivers: number | null;
  surgeMultiplier: number;
}

interface PointLike {
  lat: number;
  lng: number;
}

interface LoadRidePreviewParams {
  pickup: PointLike;
  dropoff: PointLike;
  serviceLevel: string;
}

function haversineKm(a: PointLike, b: PointLike): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function inferTrafficLevel(durationSec: number, distanceMeters: number): TrafficLevel {
  if (distanceMeters <= 0) return "unknown";
  const km = distanceMeters / 1000;
  const hours = durationSec / 3600;
  const speed = km / Math.max(hours, 0.0001);
  if (speed >= 35) return "low";
  if (speed >= 22) return "moderate";
  return "heavy";
}

function estimateFareAED(
  distanceKm: number,
  etaMinutes: number,
  serviceLevel: string,
  surgeMultiplier: number,
): number {
  const base =
    serviceLevel === "taxi_xl" ? 18 :
    serviceLevel === "taxi_premium" ? 28 : 12;
  const perKm =
    serviceLevel === "taxi_xl" ? 2.8 :
    serviceLevel === "taxi_premium" ? 4.2 : 2.1;
  const perMinute =
    serviceLevel === "taxi_xl" ? 0.55 :
    serviceLevel === "taxi_premium" ? 0.8 : 0.4;
  const raw = (base + distanceKm * perKm + etaMinutes * perMinute) * Math.max(surgeMultiplier, 1);
  return Math.round(raw);
}

function estimateWaitMinutesFromSupply(
  nearbyDrivers: number,
  trafficLevel: TrafficLevel,
): number {
  const base =
    nearbyDrivers >= 8 ? 2 :
    nearbyDrivers >= 5 ? 4 :
    nearbyDrivers >= 3 ? 6 :
    nearbyDrivers >= 1 ? 9 : 14;
  const trafficPenalty =
    trafficLevel === "heavy" ? 3 :
    trafficLevel === "moderate" ? 1 : 0;
  return base + trafficPenalty;
}

export async function loadRidePreview(
  params: LoadRidePreviewParams,
): Promise<RidePreviewData> {
  const { pickup, dropoff, serviceLevel } = params;

  let zoneKey: string | null = "GLOBAL";

  // 1) Route preview via Mapbox directions, fallback haversine
  let distanceKm = haversineKm(pickup, dropoff);
  let etaMinutes = Math.max(3, Math.round(distanceKm * 3.2));
  let trafficLevel: TrafficLevel = "unknown";

  try {
    const directions = await getDirections(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng },
    );
    if (directions) {
      distanceKm = Number((directions.distance_m / 1000).toFixed(1));
      etaMinutes = Math.max(1, Math.round(directions.duration_s / 60));
      trafficLevel = inferTrafficLevel(directions.duration_s, directions.distance_m);
    }
  } catch {
    // fallback already set
  }

  // 2) Nearby drivers from rider_presence
  const degPerKm = 1 / 111;
  const radiusKm = 3;
  const latDelta = radiusKm * degPerKm;
  const lngDelta = radiusKm * degPerKm / Math.cos((pickup.lat * Math.PI) / 180);

  const { data: drivers } = await supabase
    .from("rider_presence")
    .select("id")
    .eq("is_online", true)
    .eq("is_available", true)
    .gte("lat", pickup.lat - latDelta)
    .lte("lat", pickup.lat + latDelta)
    .gte("lng", pickup.lng - lngDelta)
    .lte("lng", pickup.lng + lngDelta)
    .limit(50);

  const nearbyDrivers = drivers?.length ?? 0;

  // 3) Surge / zone intelligence from overlays
  let surgeMultiplier = 1;
  try {
    const { data: overlay } = await supabase
      .from("geo_live_zone_overlays")
      .select("zone_key, surge_multiplier, traffic_level")
      .limit(1)
      .maybeSingle();

    if (overlay) {
      zoneKey = overlay.zone_key ?? zoneKey;
      surgeMultiplier = Number(overlay.surge_multiplier ?? 1);
      if (trafficLevel === "unknown" && overlay.traffic_level) {
        trafficLevel = overlay.traffic_level as TrafficLevel;
      }
    }
  } catch {
    // optional
  }

  const waitMinutes = estimateWaitMinutesFromSupply(nearbyDrivers, trafficLevel);
  const estimatedFare = estimateFareAED(distanceKm, etaMinutes, serviceLevel, surgeMultiplier);

  return {
    ready: true,
    waitMinutes,
    etaMinutes,
    distanceKm,
    estimatedFare,
    trafficLevel,
    zoneKey,
    nearbyDrivers,
    surgeMultiplier,
  };
}
