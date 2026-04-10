import { useEffect } from "react";
import { useRadarStore } from "@/stores/radarStore";
import { useGeoStore } from "@/lib/geo/geo-store";

/**
 * useRadarGeo — Syncs geoStore (canonical GPS) into radarStore.
 * Returns geoLoading and geoPermission so RadarPage never reads geoStore directly.
 */
export function useRadarGeo() {
  const setUserLocation = useRadarStore((s) => s.setUserLocation);
  const geoLoading = useGeoStore((s) => s.loading);
  const geoPermission = useGeoStore((s) => s.permission);

  useEffect(() => {
    // Sync current value
    const pt = useGeoStore.getState().point;
    if (pt) setUserLocation({ lat: pt.lat, lng: pt.lng, accuracy: pt.accuracy ?? null });

    // Subscribe to future updates
    const unsub = useGeoStore.subscribe((state) => {
      const p = state.point;
      if (p) setUserLocation({ lat: p.lat, lng: p.lng, accuracy: p.accuracy ?? null });
    });
    return unsub;
  }, [setUserLocation]);

  return { geoLoading, geoPermission };
}
