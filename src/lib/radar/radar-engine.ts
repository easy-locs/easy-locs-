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

/** Haversine distance in km */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimate ETA in minutes from distance in km */
export function estimateETA(distanceKm: number, avgSpeedKmh = 30): number {
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/** Format ETA for display */
export function formatETA(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}

/** Format distance for display */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Proximity badge */
export function proximityBadge(km: number): { label: string; tier: "nearby" | "medium" | "far" } {
  if (km < 2) return { label: "Nearby", tier: "nearby" };
  if (km < 8) return { label: "Medium", tier: "medium" };
  return { label: "Far", tier: "far" };
}

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
