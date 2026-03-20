/**
 * radar.ts — Proximity/nearby engine using Haversine.
 */

interface HasCoords {
  lat: number;
  lng: number;
}

const R_KM = 6371;

export function distanceKm(a: HasCoords, b: HasCoords): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function filterByRadius<T extends HasCoords>(entities: T[], center: HasCoords, radiusKm: number): T[] {
  return entities.filter((e) => distanceKm(center, e) <= radiusKm);
}

export function sortByDistance<T extends HasCoords>(entities: T[], center: HasCoords): (T & { _distKm: number })[] {
  return entities
    .map((e) => ({ ...e, _distKm: distanceKm(center, e) }))
    .sort((a, b) => a._distKm - b._distKm);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
