/**
 * useCurrentLocation — Initializes GPS and keeps locationStore in sync.
 * Call once at app root or on pages that need GPS.
 */
import { useEffect, useRef } from "react";
import { useLocationStore } from "@/stores/locationStore";
import {
  getCurrentPositionHighAccuracy,
  getGeoPermissionState,
  watchCurrentPosition,
  stopWatchingPosition,
} from "@/lib/location/geolocation";

const DUBAI_FALLBACK = { lat: 25.2048, lng: 55.2708, accuracy: 5000, timestamp: new Date().toISOString() };

export function useCurrentLocation(opts?: { watch?: boolean }) {
  const started = useRef(false);
  const store = useLocationStore();

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      store.setLoading(true);
      const perm = await getGeoPermissionState();
      store.setPermissionState(perm);

      if (perm === "denied") {
        store.setIsFallback(true);
        if (!store.currentLocation) {
          store.setCurrentLocation(DUBAI_FALLBACK);
        }
        store.setLoading(false);
        return;
      }

      try {
        const pos = await getCurrentPositionHighAccuracy();
        store.setCurrentLocation(pos);
        store.setPermissionState("granted");
      } catch {
        store.setIsFallback(true);
        store.setPermissionState("denied");
        if (!store.currentLocation) {
          store.setCurrentLocation(store.lastKnownLocation || DUBAI_FALLBACK);
        }
      } finally {
        store.setLoading(false);
      }

      if (opts?.watch) {
        watchCurrentPosition(
          (pos) => store.setCurrentLocation(pos),
          () => {},
        );
      }
    })();

    return () => {
      if (opts?.watch) stopWatchingPosition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    location: store.currentLocation,
    loading: store.loading,
    error: store.error,
    permission: store.permissionState,
    isFallback: store.isFallback,
  };
}
