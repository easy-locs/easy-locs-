/**
 * Haversine distance between two lat/lng points in km.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
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
