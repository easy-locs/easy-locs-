/**
 * Delivery geo utilities — haversine distance + ETA estimation.
 * Structured so a real routing provider can replace the heuristic later.
 */

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
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

/** Estimated ETA in minutes — uses avg city speed heuristic (25 km/h). */
export function estimateETA(distanceKm: number, avgSpeedKmh = 25): number {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

/** Format distance for display */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/** Format ETA for display */
export function formatETA(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}
