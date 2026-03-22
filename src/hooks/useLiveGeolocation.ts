/**
 * useLiveGeolocation — Thin wrapper over geoStore for components
 * needing real-time coordinates.
 */
import { useGeoStore } from "@/lib/geo/geo-store";

export function useLiveGeolocation(enabled: boolean) {
  const point = useGeoStore((s) => s.point);
  const error = useGeoStore((s) => s.error);

  if (!enabled) return { coords: null, error: null };

  const coords = point
    ? {
        latitude: point.lat,
        longitude: point.lng,
        accuracy: point.accuracy ?? null,
        altitude: null,
        altitudeAccuracy: null,
        heading: point.heading ?? null,
        speed: point.speed ?? null,
      }
    : null;

  return { coords, error };
}
