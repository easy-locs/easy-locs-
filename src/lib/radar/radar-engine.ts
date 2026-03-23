/**
 * Radar Engine — Core computation for nearby drivers, distance, ETA.
 * Pure functions, no side effects.
 */

export interface Driver {
  id: string;
  lat: number;
  lng: number;
  status: "available" | "busy";
  type: "taxi" | "delivery";
  rating: number;
  name?: string;
  vehicle?: string;
  plate?: string;
  avatar?: string;
}

export interface DriverWithDistance extends Driver {
  distance: number; // km
  eta: number;      // minutes
}

export interface RadarResult {
  nearbyDrivers: DriverWithDistance[];
  nearestDriver: DriverWithDistance | null;
  etaMinutes: number | null;
  availableCount: number;
  totalCount: number;
}

// Re-export canonical geo functions for backward compatibility
import { haversineKm, estimateETA as _estimateETA, formatETA as _formatETA, formatDistance as _formatDistance, proximityBadge as _proximityBadge } from "@/lib/geo/distance";
export const haversine = haversineKm;
export { haversineKm } from "@/lib/geo/distance";
export const estimateETA = (distanceKm: number, avgSpeedKmh = 30) => Math.round((distanceKm / avgSpeedKmh) * 60);
export const formatETA = _formatETA;
export const formatDistance = _formatDistance;
export const proximityBadge = _proximityBadge;

/**
 * Core radar computation.
 * Filters to radius, sorts by distance, computes ETAs.
 */
export function computeRadar(
  userLat: number,
  userLng: number,
  drivers: Driver[],
  radiusKm = 10,
  driverType?: "taxi" | "delivery",
): RadarResult {
  const filtered = driverType
    ? drivers.filter(d => d.type === driverType)
    : drivers;

  const available = filtered.filter(d => d.status === "available");

  const withDistance: DriverWithDistance[] = available
    .map(d => ({
      ...d,
      distance: haversine(userLat, userLng, d.lat, d.lng),
      eta: estimateETA(haversine(userLat, userLng, d.lat, d.lng)),
    }))
    .filter(d => d.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  const nearest = withDistance[0] || null;

  return {
    nearbyDrivers: withDistance.slice(0, 20),
    nearestDriver: nearest,
    etaMinutes: nearest?.eta ?? null,
    availableCount: withDistance.length,
    totalCount: filtered.length,
  };
}

/**
 * Select best driver using combined score: proximity + rating.
 */
export function selectBestDriver(drivers: DriverWithDistance[]): DriverWithDistance | null {
  if (!drivers.length) return null;

  return drivers
    .filter(d => d.status === "available")
    .sort((a, b) => {
      // Score = inverse distance weight + rating bonus
      const scoreA = (1 / Math.max(a.distance, 0.1)) * 10 + a.rating;
      const scoreB = (1 / Math.max(b.distance, 0.1)) * 10 + b.rating;
      return scoreB - scoreA;
    })[0] || null;
}

// ── Aliases for migration from duplicate modules ──

/** Alias: same as haversine, for consumers that used haversineKm */
export const haversineKm = haversine;

/** Radius filter presets (migrated from geo-distance.ts) */
export const RADIUS_OPTIONS = [
  { value: "5", label: "5 km", km: 5 },
  { value: "10", label: "10 km", km: 10 },
  { value: "25", label: "25 km", km: 25 },
  { value: "50", label: "50 km", km: 50 },
  { value: "city", label: "City", km: null },
  { value: "country", label: "Country", km: null },
  { value: "worldwide", label: "Worldwide", km: null },
] as const;

export type RadiusValue = typeof RADIUS_OPTIONS[number]["value"];

/** Filter entities within radius (migrated from location/radar.ts) */
export function filterByRadius<T extends { lat: number; lng: number }>(
  entities: T[],
  center: { lat: number; lng: number },
  radiusKm: number,
): T[] {
  return entities.filter((e) => haversine(center.lat, center.lng, e.lat, e.lng) <= radiusKm);
}

/** Sort entities by distance (migrated from location/radar.ts) */
export function sortByDistance<T extends { lat: number; lng: number }>(
  entities: T[],
  center: { lat: number; lng: number },
): (T & { _distKm: number })[] {
  return entities
    .map((e) => ({ ...e, _distKm: haversine(center.lat, center.lng, e.lat, e.lng) }))
    .sort((a, b) => a._distKm - b._distKm);
}
