/**
 * Live ETA — Compute real-time ETA from driver position to pickup.
 */
import { haversine } from "@/lib/radar/radar-engine";

export function computeLiveETA(
  driverLat: number,
  driverLng: number,
  pickupLat: number,
  pickupLng: number,
  speedKmh = 30,
) {
  const distanceKm = haversine(driverLat, driverLng, pickupLat, pickupLng);
  const etaMin = Math.max(1, Math.round((distanceKm / speedKmh) * 60));
  return { distanceKm, etaMin };
}
