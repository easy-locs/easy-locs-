/**
 * useZoneContext — Reactive hook that resolves current user location to a zone.
 * Updates when location changes. Used by Explorer, Radar, Map, Search.
 */
import { useEffect, useState } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useGeoStore } from "@/stores/geoStore";
import { resolveZoneContext, type ZoneContext } from "@/lib/geo/zoneResolver";

export function useZoneContext() {
  const [ctx, setCtx] = useState<ZoneContext | null>(null);
  const [loading, setLoading] = useState(true);

  const geoLat = useGeoStore((s) => s.currentPosition.lat);
  const geoLng = useGeoStore((s) => s.currentPosition.lng);
  const locLat = useLocationStore((s) => s.currentLocation?.lat);
  const locLng = useLocationStore((s) => s.currentLocation?.lng);

  // Use locationStore if available, fallback to geoStore
  const lat = locLat ?? (geoLat !== 0 ? geoLat : null);
  const lng = locLng ?? (geoLng !== 0 ? geoLng : null);

  useEffect(() => {
    if (lat == null || lng == null) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    resolveZoneContext(lat, lng).then((result) => {
      if (!cancelled) {
        setCtx(result);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [lat, lng]);

  return {
    ...ctx,
    loading,
    userLat: lat,
    userLng: lng,
    hasLocation: lat != null && lng != null,
  };
}
