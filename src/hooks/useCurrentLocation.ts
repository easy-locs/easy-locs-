/**
 * useCurrentLocation — Initializes GPS and keeps locationStore in sync.
 * Call once at app root or on pages that need GPS.
 * 
 * FORCED MODE: If GPS is denied, retries aggressively after a short delay.
 * Exposes `forceRetry()` so any component can trigger a fresh GPS attempt.
 */
import { useEffect, useRef, useCallback } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { platformBus } from "@/lib/shared/platform-bus";
import {
  getCurrentPositionHighAccuracy,
  getGeoPermissionState,
  watchCurrentPosition,
  stopWatchingPosition,
} from "@/lib/location/geolocation";

const DUBAI_FALLBACK = { lat: 25.2048, lng: 55.2708, accuracy: 5000, timestamp: new Date().toISOString() };

async function attemptGps(): Promise<boolean> {
  const store = useLocationStore.getState;

  try {
    const pos = await getCurrentPositionHighAccuracy();
    console.log("[useCurrentLocation] GPS success", pos);
    store().setCurrentLocation(pos);
    store().setIsFallback(false);
    store().setPermissionState("granted");
    store().setError(null);
    platformBus.emit("geo.position.updated", { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, source: "gps" }, "system");
    platformBus.emit("geo.permission.changed", { state: "granted" }, "system");
    return true;
  } catch (err: any) {
    console.error("[useCurrentLocation] GPS failed", { code: err?.code, message: err?.message });

    // If we already have a valid live location, don't regress
    const existing = store().currentLocation;
    const hasValidLive = existing && existing.accuracy != null && existing.accuracy < 5000;

    if (hasValidLive) {
      console.log("[useCurrentLocation] error ignored — valid live location already exists", existing);
      return true; // treat as success since we have good data
    }

    if (err?.code === 1) {
      store().setPermissionState("denied");
      platformBus.emit("geo.permission.changed", { state: "denied" }, "system");
    } else {
      store().setPermissionState("prompt");
    }

    store().setError(err?.message || "Location unavailable");
    store().setIsFallback(true);

    if (!existing) {
      store().setCurrentLocation(store().lastKnownLocation || DUBAI_FALLBACK);
    }

    return false;
  }
}

export function useCurrentLocation(opts?: { watch?: boolean }) {
  const initialized = useRef(false);

  const forceRetry = useCallback(async () => {
    const store = useLocationStore.getState;
    store().setLoading(true);
    store().setError(null);

    const success = await attemptGps();

    if (success && opts?.watch) {
      // Restart watcher on successful retry
      stopWatchingPosition();
      watchCurrentPosition(
        (pos) => {
          store().setCurrentLocation(pos);
          store().setIsFallback(false);
          store().setPermissionState("granted");
          store().setError(null);
          platformBus.emit("geo.position.updated", { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, source: "watch" }, "system");
        },
        (geoErr) => {
          const current = store().currentLocation;
          if (current && current.accuracy != null && current.accuracy < 5000) return;
          if (geoErr?.code === 1) store().setPermissionState("denied");
        },
      );
    }

    store().setLoading(false);
    return success;
  }, [opts?.watch]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const store = useLocationStore.getState;

    (async () => {
      store().setLoading(true);
      const perm = await getGeoPermissionState();
      store().setPermissionState(perm);

      // Always attempt GPS regardless of permissions API result
      // (some browsers report "denied" but still allow getCurrentPosition)
      const success = await attemptGps();

      // If first attempt failed and it wasn't a hard denial, retry once after delay
      if (!success) {
        const permAfter = store().permissionState;
        if (permAfter !== "denied") {
          console.log("[useCurrentLocation] first attempt failed, retrying in 2s...");
          await new Promise((r) => setTimeout(r, 2000));
          await attemptGps();
        }
      }

      store().setLoading(false);

      if (opts?.watch) {
        watchCurrentPosition(
          (pos) => {
            console.log("[useCurrentLocation] GPS watch update", pos);
            store().setCurrentLocation(pos);
            store().setIsFallback(false);
            store().setPermissionState("granted");
            store().setError(null);
            platformBus.emit("geo.position.updated", { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, source: "watch" }, "system");
          },
          (geoErr) => {
            const current = store().currentLocation;
            if (current && current.accuracy != null && current.accuracy < 5000) return;
            if (geoErr?.code === 1) store().setPermissionState("denied");
          },
        );
      }
    })();

    return () => {
      if (opts?.watch) stopWatchingPosition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    location: useLocationStore((s) => s.currentLocation),
    loading: useLocationStore((s) => s.loading),
    error: useLocationStore((s) => s.error),
    permission: useLocationStore((s) => s.permissionState),
    isFallback: useLocationStore((s) => s.isFallback),
    forceRetry,
  };
}
