/**
 * useLiveGeolocation — Thin wrapper over locationStore for components
 * needing real-time coordinates. Uses the canonical geo pipeline.
 */
import { useLocationStore } from "@/stores/locationStore";

export function useLiveGeolocation(enabled: boolean) {
  const location = useLocationStore((s) => s.currentLocation);
  const error = useLocationStore((s) => s.error);

  if (!enabled) return { coords: null, error: null };

  // Map locationStore format to GeolocationCoordinates-like shape
  const coords = location
    ? {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy ?? null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      }
    : null;

  return { coords, error };
}
