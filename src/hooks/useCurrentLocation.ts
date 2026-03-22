/**
 * useCurrentLocation — Initializes GPS and keeps locationStore in sync.
 * Call once at app root or on pages that need GPS.
 * 
 * FIX: Removed stale closure dependencies — all store reads happen via
 * getState() inside async paths to prevent old values from overwriting live GPS.
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

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const store = useLocationStore.getState;

    (async () => {
      store().setLoading(true);
      const perm = await getGeoPermissionState();
      store().setPermissionState(perm);

      if (perm === "denied") {
        // If we already have a valid position, don't block the UI
        const existing = store().currentLocation;
        if (existing && existing.accuracy < 5000) {
          console.log("[useCurrentLocation] perm=denied but valid location exists, skipping fallback");
          store().setLoading(false);
          // Still try to get position — browser may allow it despite permissions API
        } else {
          store().setIsFallback(true);
          store().setError("Location permission denied");
          if (!existing) {
            store().setCurrentLocation(store().lastKnownLocation || DUBAI_FALLBACK);
          }
          store().setLoading(false);
          return;
        }
      }

      try {
        const pos = await getCurrentPositionHighAccuracy();
        console.log("[useCurrentLocation] GPS success", pos);
        store().setCurrentLocation(pos);
        store().setIsFallback(false);
        store().setPermissionState("granted");
        store().setError(null);
      } catch (err: any) {
        console.error("[useCurrentLocation] GPS failed", {
          code: err?.code,
          message: err?.message,
        });

        if (err?.code === 1) {
          store().setPermissionState("denied");
        } else {
          store().setPermissionState("prompt");
          store().setError(err?.message || "Location unavailable");
        }

        // Only enter fallback state if NO valid live location exists yet
        const existing = store().currentLocation;
        const hasValidLive = existing && !store().isFallback && existing.accuracy < 5000;
        if (!hasValidLive) {
          store().setIsFallback(true);
          if (!existing) {
            store().setCurrentLocation(store().lastKnownLocation || DUBAI_FALLBACK);
          }
        }
      } finally {
        store().setLoading(false);
      }

      if (opts?.watch) {
        watchCurrentPosition(
          (pos) => {
            console.log("[useCurrentLocation] GPS watch update", pos);
            store().setCurrentLocation(pos);
            store().setIsFallback(false);
            store().setPermissionState("granted");
            store().setError(null);
          },
          (geoErr) => {
            console.error("[useCurrentLocation] GPS watch error", geoErr);
            if (geoErr?.code === 1) store().setPermissionState("denied");
            // Do NOT overwrite currentLocation on watch errors — keep last known good
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
  };
}
