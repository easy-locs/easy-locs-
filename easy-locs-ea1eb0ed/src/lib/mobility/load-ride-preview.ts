/**
 * load-ride-preview.ts — Canonical ride preview engine.
 * Computes ETA, fare estimate, nearby drivers, traffic & surge
 * BEFORE the user submits a ride request.
 *
 * Sources: Mapbox directions, rider_presence, geo_live_zone_overlays
 * No side effects — pure read + compute.
 */
import { db } from "@/services/db";
import { computeSmartETA, getWeatherSurgeMultiplier } from "@/lib/mobility/smart-eta-engine";
import type { SmartTrafficLevel, SmartWeatherImpact } from "@/lib/mobility/smart-eta-engine";
import { recordETAPrediction } from "@/lib/mobility/eta-accuracy-tracker";

export type TrafficLevel = "low" | "moderate" | "heavy" | "gridlock" | "unknown";

export interface RidePreviewData {
  ready: boolean;
  waitMinutes: number | null;
  etaMinutes: number | null;
  etaRangeMin: number | null;
  etaRangeMax: number | null;
  distanceKm: number | null;
  estimatedFare: number | null;
  trafficLevel: TrafficLevel;
  weatherImpact: SmartWeatherImpact;
  badge: string | null;
  confidenceScore: number | null;
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
    trafficLevel === "gridlock" ? 5 :
    trafficLevel === "heavy" ? 3 :
    trafficLevel === "moderate" ? 1 : 0;
  return base + trafficPenalty;
}

export async function loadRidePreview(
  params: LoadRidePreviewParams,
): Promise<RidePreviewData> {
  const { pickup, dropoff, serviceLevel } = params;

  let zoneKey: string | null = "GLOBAL";

  let distanceKm = haversineKm(pickup, dropoff);
  let etaMinutes = Math.max(3, Math.round(distanceKm * 3.2));
  let etaRangeMin: number | null = null;
  let etaRangeMax: number | null = null;
  let trafficLevel: TrafficLevel = "unknown";
  let weatherImpact: SmartWeatherImpact = "none";
  let badge: string | null = null;
  let confidenceScore: number | null = null;

  try {
    const smartEta = await computeSmartETA(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng },
    );
    distanceKm = smartEta.distanceKm;
    etaMinutes = smartEta.etaMinutes;
    etaRangeMin = smartEta.etaRangeMin;
    etaRangeMax = smartEta.etaRangeMax;
    trafficLevel = smartEta.trafficLevel as TrafficLevel;
    weatherImpact = smartEta.weatherImpact;
    badge = smartEta.badge;
    confidenceScore = smartEta.confidenceScore;
  } catch {
    etaRangeMin = Math.max(1, etaMinutes - 2);
    etaRangeMax = etaMinutes + 4;
  }

  const degPerKm = 1 / 111;
  const radiusKm = 3;
  const latDelta = radiusKm * degPerKm;
  const lngDelta = radiusKm * degPerKm / Math.cos((pickup.lat * Math.PI) / 180);

  const { data: drivers } = await db
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

  let surgeMultiplier = 1;
  try {
    const { data: overlay } = await db
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
  } catch { /* optional */ }

  const weatherSurge = getWeatherSurgeMultiplier(weatherImpact);
  surgeMultiplier = Number((surgeMultiplier * weatherSurge).toFixed(2));

  const waitMinutes = estimateWaitMinutesFromSupply(nearbyDrivers, trafficLevel);
  const estimatedFare = estimateFareAED(distanceKm, etaMinutes, serviceLevel, surgeMultiplier);

  void recordETAPrediction({
    job_id: null,
    prediction_type: "booking",
    predicted_eta_minutes: etaMinutes,
    predicted_range_min: etaRangeMin ?? etaMinutes,
    predicted_range_max: etaRangeMax ?? etaMinutes,
    traffic_level: trafficLevel,
    weather_impact: weatherImpact,
    rush_hour_multiplier: 1,
    confidence_score: confidenceScore ?? 0.5,
    origin_lat: pickup.lat,
    origin_lng: pickup.lng,
    destination_lat: dropoff.lat,
    destination_lng: dropoff.lng,
  }).catch((e) => { console.warn("[ETA_TRACKING] Failed to record preview prediction:", e); });

  return {
    ready: true,
    waitMinutes,
    etaMinutes,
    etaRangeMin,
    etaRangeMax,
    distanceKm,
    estimatedFare,
    trafficLevel,
    weatherImpact,
    badge,
    confidenceScore,
    zoneKey,
    nearbyDrivers,
    surgeMultiplier,
  };
}
