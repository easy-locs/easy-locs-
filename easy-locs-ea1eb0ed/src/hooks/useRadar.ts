/**
 * useRadar — Unified radar hook combining geolocation + drivers + computation.
 * Uses locationStore exclusively (no legacy useGeolocation).
 */
import { useMemo } from "react";
import { computeRadar, type RadarResult, formatETA, formatDistance, proximityBadge } from "@/lib/radar/radar-engine";
import { useGeoDrivers } from "./useGeoDrivers";
import { useLocationStore } from "@/stores/locationStore";

export function useRadar(opts?: { type?: "taxi" | "delivery"; radiusKm?: number }) {
  const { type, radiusKm = 10 } = opts || {};
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const loading = useLocationStore((s) => s.loading);
  const lat = currentLocation?.lat ?? null;
  const lng = currentLocation?.lng ?? null;
  const { drivers, connected } = useGeoDrivers(lat, lng);

  const radar = useMemo((): RadarResult | null => {
    if (!lat || !lng) return null;
    return computeRadar(lat, lng, drivers, radiusKm, type);
  }, [lat, lng, drivers, radiusKm, type]);

  return {
    radar,
    geo: { lat, lng, loading },
    connected,
    formatETA,
    formatDistance,
    proximityBadge,
    loading,
  };
}
