/**
 * requestLocation — Canonical one-shot location request that writes to locationStore.
 * Use this instead of raw navigator.geolocation calls everywhere.
 * Updates permission state on both success and failure.
 */
import { useLocationStore } from "@/stores/locationStore";
import { getCurrentPositionHighAccuracy } from "@/lib/location/geolocation";
import { platformBus } from "@/lib/shared/platform-bus";

export async function requestLocation(): Promise<{ lat: number; lng: number } | null> {
  const store = useLocationStore.getState;

  try {
    const pos = await getCurrentPositionHighAccuracy();
    store().setCurrentLocation(pos);
    store().setIsFallback(false);
    store().setPermissionState("granted");
    store().setError(null);
    platformBus.emit("geo.position.updated", { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, source: "gps" }, "system");
    return { lat: pos.lat, lng: pos.lng };
  } catch (err: any) {
    // Update store with failure info
    if (err?.code === 1) {
      store().setPermissionState("denied");
    }
    store().setError(err?.message || "Location unavailable");

    // Fallback: return existing location if available
    const existing = store().currentLocation;
    if (existing && existing.accuracy != null && existing.accuracy < 5000) {
      return { lat: existing.lat, lng: existing.lng };
    }

    return null;
  }
}
