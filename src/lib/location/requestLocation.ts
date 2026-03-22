/**
 * requestLocation — Canonical one-shot location request that writes to locationStore.
 * Use this instead of raw navigator.geolocation calls everywhere.
 */
import { useLocationStore } from "@/stores/locationStore";
import { getCurrentPositionHighAccuracy } from "@/lib/location/geolocation";

export async function requestLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const pos = await getCurrentPositionHighAccuracy();
    useLocationStore.getState().setCurrentLocation(pos);
    return { lat: pos.lat, lng: pos.lng };
  } catch {
    return null;
  }
}
