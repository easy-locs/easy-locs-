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
  const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
  const setPermissionState = useLocationStore((s) => s.setPermissionState);
  const setLoading = useLocationStore((s) => s.setLoading);
  const setIsFallback = useLocationStore((s) => s.setIsFallback);
  const setError = useLocationStore((s) => s.setError);
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const lastKnownLocation = useLocationStore((s) => s.lastKnownLocation);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      setLoading(true);
      const perm = await getGeoPermissionState();
      setPermissionState(perm);

      if (perm === "denied") {
        setIsFallback(true);
        setError("Location permission denied");
        if (!currentLocation) {
          setCurrentLocation(lastKnownLocation || DUBAI_FALLBACK);
        }
        setLoading(false);
        return;
      }

      try {
        const pos = await getCurrentPositionHighAccuracy();
        console.log("[useCurrentLocation] GPS success", pos);
        setCurrentLocation(pos);
        setIsFallback(false);
        setPermissionState("granted");
        setError(null);
      } catch (err: any) {
        console.error("[useCurrentLocation] GPS failed", {
          code: err?.code,
          message: err?.message,
        });

        if (err?.code === 1) {
          setPermissionState("denied");
        } else {
          setPermissionState("prompt");
          setError(err?.message || "Location unavailable");
        }

        setIsFallback(true);
        if (!currentLocation) {
          setCurrentLocation(lastKnownLocation || DUBAI_FALLBACK);
        }
      } finally {
        setLoading(false);
      }

      if (opts?.watch) {
        watchCurrentPosition(
          (pos) => {
            console.log("[useCurrentLocation] GPS watch update", pos);
            setCurrentLocation(pos);
            setIsFallback(false);
            setPermissionState("granted");
            setError(null);
          },
          (geoErr) => {
            console.error("[useCurrentLocation] GPS watch error", geoErr);
            if (geoErr?.code === 1) setPermissionState("denied");
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
