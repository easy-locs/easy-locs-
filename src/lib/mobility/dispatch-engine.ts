/**
 * dispatch-engine — Orchestrates ride dispatch: zone intel → pricing → driver matching.
 */
import { findNearbyDrivers, type NearbyDriver } from "./driver-matching-engine";
import { computeRidePrice, type PricingResult } from "./pricing-engine";
import { getZoneIntelligence } from "./zone-intelligence";

export interface DispatchResult {
  pricing: PricingResult;
  drivers: NearbyDriver[];
}

export async function dispatchRide(payload: {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  [key: string]: any;
}): Promise<DispatchResult> {
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = payload;

  // 1. Zone context
  const zone = await getZoneIntelligence(pickup_lat, pickup_lng);

  // 2. Distance (haversine-lite)
  const dx = pickup_lat - dropoff_lat;
  const dy = pickup_lng - dropoff_lng;
  const distanceKm = Math.sqrt(dx * dx + dy * dy) * 111;
  const durationMin = distanceKm * 2;

  // 3. Pricing
  const pricing = computeRidePrice({ distanceKm, durationMin, zone });

  // 4. Find drivers
  const drivers = await findNearbyDrivers(pickup_lat, pickup_lng);

  return { pricing, drivers: drivers.slice(0, 5) };
}
