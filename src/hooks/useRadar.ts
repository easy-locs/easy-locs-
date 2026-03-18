/**
 * useRadar — Unified radar hook combining geolocation + drivers + computation.
 */
import { useMemo } from "react";
import { computeRadar, type RadarResult, formatETA, formatDistance, proximityBadge } from "@/lib/radar/radar-engine";
import { useGeoDrivers } from "./useGeoDrivers";
import { useGeolocation } from "./useGeolocation";

export function useRadar(opts?: { type?: "taxi" | "delivery"; radiusKm?: number }) {
  const { type, radiusKm = 10 } = opts || {};
  const geo = useGeolocation();
  const { drivers, connected } = useGeoDrivers(geo.lat, geo.lng);

  const radar = useMemo((): RadarResult | null => {
    if (!geo.lat || !geo.lng) return null;
    return computeRadar(geo.lat, geo.lng, drivers, radiusKm, type);
  }, [geo.lat, geo.lng, drivers, radiusKm, type]);

  return {
    radar,
    geo,
    connected,
    formatETA,
    formatDistance,
    proximityBadge,
    loading: geo.loading,
  };
}
