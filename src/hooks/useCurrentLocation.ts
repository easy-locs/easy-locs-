/**
 * useCurrentLocation — Bridge hook that exposes geoStore state
 * with forceRetry capability. Drop-in replacement for old version.
 */
import { useCallback } from "react";
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";
import { useLocationStore } from "@/stores/locationStore";

export function useCurrentLocation(_opts?: { watch?: boolean }) {
  const forceRetry = useCallback(async () => {
    geoService.forceRetry();
    return true;
  }, []);

  return {
    location: useLocationStore((s) => s.currentLocation),
    loading: useGeoStore((s) => s.loading),
    error: useGeoStore((s) => s.error),
    permission: useGeoStore((s) => s.permission),
    isFallback: useLocationStore((s) => s.isFallback),
    forceRetry,
  };
}
