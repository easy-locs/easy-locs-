export interface LiveETAResult {
  distanceKm: number;
  etaMinutes: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Quick inline ETA for UI display. For route-based ETA use useRideLiveRoute.
 */
export function computeLiveETASimple(
  driver: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number } | null | undefined,
): LiveETAResult | null {
  if (!driver || !destination) return null;

  const distanceKm = haversineKm(driver.lat, driver.lng, destination.lat, destination.lng);
  const etaMinutes = Math.max(2, Math.round(distanceKm * 2));

  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    etaMinutes,
  };
}
