/**
 * CANONICAL GEO-DISTANCE MODULE
 * ==============================
 * The ONE source of truth for haversine distance, ETA estimation,
 * and proximity formatting across the entire platform.
 *
 * ALL other haversine implementations MUST import from here.
 * Edge functions (Deno) may keep a local copy since they can't import src/.
 */

const EARTH_RADIUS_KM = 6371;

/** Haversine distance between two GPS points, in kilometers. */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Aliases for backward compatibility ──
export const haversine = haversineKm;
export const haversineDistance = haversineKm;
export const haversineDistanceKm = haversineKm;

/** Estimated ETA in minutes from distance in km. */
export function estimateETA(distanceKm: number, avgSpeedKmh = 25): number {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

/** Format distance for display (e.g. "800m", "3.2km"). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/** Format ETA for display (e.g. "5 min", "1h30"). */
export function formatETA(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

/** Proximity badge for display. */
export function proximityBadge(km: number): { label: string; tier: "nearby" | "medium" | "far" } {
  if (km < 2) return { label: "Nearby", tier: "nearby" };
  if (km < 8) return { label: "Medium", tier: "medium" };
  return { label: "Far", tier: "far" };
}

/** Filter entities within radius. */
export function filterByRadius<T extends { lat: number; lng: number }>(
  entities: T[],
  center: { lat: number; lng: number },
  radiusKm: number,
): T[] {
  return entities.filter((e) => haversineKm(center.lat, center.lng, e.lat, e.lng) <= radiusKm);
}

/** Sort entities by distance from a point. */
export function sortByDistance<T extends { lat: number; lng: number }>(
  entities: T[],
  center: { lat: number; lng: number },
): (T & { _distKm: number })[] {
  return entities
    .map((e) => ({ ...e, _distKm: haversineKm(center.lat, center.lng, e.lat, e.lng) }))
    .sort((a, b) => a._distKm - b._distKm);
}

/** Radius filter presets. */
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
