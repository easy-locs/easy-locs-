/**
 * Live Mobility — ETA computation (pure function, no DB).
 */
import { haversineKm } from "@/lib/geo/distance";
import type { ETAResult } from "./types";

const DEFAULT_RIDER_SPEED_KMH = 25;
const DEFAULT_PREP_MINUTES = 15;
const DEFAULT_HANDOVER_MINUTES = 2;

export { DEFAULT_RIDER_SPEED_KMH, DEFAULT_PREP_MINUTES, DEFAULT_HANDOVER_MINUTES };

export function computeETA(params: {
  merchantLat: number;
  merchantLng: number;
  customerLat: number;
  customerLng: number;
  riderLat?: number | null;
  riderLng?: number | null;
  prepMinutes?: number;
  handoverMinutes?: number;
  riderSpeedKmh?: number;
  trafficFactor?: number;
  weatherFactor?: number;
}): ETAResult {
  const {
    merchantLat, merchantLng, customerLat, customerLng,
    riderLat, riderLng,
    prepMinutes = DEFAULT_PREP_MINUTES,
    handoverMinutes = DEFAULT_HANDOVER_MINUTES,
    riderSpeedKmh = DEFAULT_RIDER_SPEED_KMH,
    trafficFactor = 1.0,
    weatherFactor = 1.0,
  } = params;

  const speedFactor = Math.max(0.3, trafficFactor * weatherFactor);
  const effectiveSpeed = riderSpeedKmh * speedFactor;

  let riderToMerchantKm = 0;
  if (riderLat != null && riderLng != null) {
    riderToMerchantKm = haversineKm(Number(riderLat), Number(riderLng), merchantLat, merchantLng);
  }
  const pickupMinutes = Math.round((riderToMerchantKm / effectiveSpeed) * 60);

  const merchantToCustomerKm = haversineKm(merchantLat, merchantLng, customerLat, customerLng);
  const travelMinutes = Math.round((merchantToCustomerKm / effectiveSpeed) * 60);

  const totalMinutes = prepMinutes + pickupMinutes + handoverMinutes + travelMinutes;

  return {
    merchant_id: "",
    estimated_prep_minutes: prepMinutes,
    estimated_pickup_minutes: pickupMinutes,
    estimated_travel_minutes: travelMinutes,
    estimated_total_minutes: totalMinutes,
    traffic_factor: trafficFactor,
    weather_factor: weatherFactor,
    demand_factor: 1.0,
    rider_supply_factor: 1.0,
  };
}

export function computeTaxiPickupETA(params: {
  customerLat: number;
  customerLng: number;
  riderLat: number;
  riderLng: number;
  riderSpeedKmh?: number;
  trafficFactor?: number;
  weatherFactor?: number;
}): number {
  const speed = (params.riderSpeedKmh ?? 30) * (params.trafficFactor ?? 1.0) * (params.weatherFactor ?? 1.0);
  const dist = haversineKm(params.customerLat, params.customerLng, params.riderLat, params.riderLng);
  return Math.max(1, Math.round((dist / Math.max(5, speed)) * 60));
}
