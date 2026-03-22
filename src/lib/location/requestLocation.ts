/**
 * requestLocation — One-shot location request using geoService.
 * Returns current point from geoStore, or forces a retry if none.
 */
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";

export async function requestLocation(): Promise<{ lat: number; lng: number } | null> {
  const point = useGeoStore.getState().point;
  if (point) return { lat: point.lat, lng: point.lng };

  // Force a retry and wait briefly for result
  geoService.forceRetry();

  return new Promise((resolve) => {
    const unsub = useGeoStore.subscribe((state) => {
      if (state.point) {
        unsub();
        resolve({ lat: state.point.lat, lng: state.point.lng });
      }
    });
    // Timeout after 8s
    setTimeout(() => {
      unsub();
      const p = useGeoStore.getState().point;
      resolve(p ? { lat: p.lat, lng: p.lng } : null);
    }, 8000);
  });
}
