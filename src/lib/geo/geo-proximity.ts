/**
 * geo-proximity — Atomic unit: calculate proximity and ETA between points.
 * Single responsibility: distance + time calculations only.
 */

const trace = (step: string, phase: "input" | "output", payload?: Record<string, unknown>) => {
  console.log(`[GEO][${step}] ${phase}:`, payload ?? {});
};

export interface ProximityResult {
  distanceKm: number;
  estimatedMinutes: number;
  walkingMinutes: number;
}

const EARTH_RADIUS_KM = 6371;

export function calculateProximity(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  speedKmh = 30
): ProximityResult {
  trace("proximity", "input", { from, to, speedKmh });

  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(EARTH_RADIUS_KM * c * 100) / 100;
  const estimatedMinutes = Math.ceil((distanceKm / speedKmh) * 60);
  const walkingMinutes = Math.ceil((distanceKm / 5) * 60);

  const result = { distanceKm, estimatedMinutes, walkingMinutes };
  trace("proximity", "output", result);
  return result;
}

export function isWithinRadius(
  center: { lat: number; lng: number },
  point: { lat: number; lng: number },
  radiusKm: number
): boolean {
  const { distanceKm } = calculateProximity(center, point);
  return distanceKm <= radiusKm;
}
