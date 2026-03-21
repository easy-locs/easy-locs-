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
        if (!currentLocation) {
          setCurrentLocation(lastKnownLocation || DUBAI_FALLBACK);
        }
        setLoading(false);
        return;
      }

      try {
        const pos = await getCurrentPositionHighAccuracy();
        setCurrentLocation(pos);
        setIsFallback(false);
        setPermissionState("granted");
        setError(null);
      } catch (err: any) {
        // Only mark as denied if it's actually a permission denial (code 1)
        const isDenied = err?.code === 1;
        if (isDenied) {
          setPermissionState("denied");
        } else {
          // Timeout or unavailable — keep as prompt so retry is possible
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
            setCurrentLocation(pos);
            setError(null);
          },
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
    location: useLocationStore((s) => s.currentLocation),
    loading: useLocationStore((s) => s.loading),
    error: useLocationStore((s) => s.error),
    permission: useLocationStore((s) => s.permissionState),
    isFallback: useLocationStore((s) => s.isFallback),
  };
}
