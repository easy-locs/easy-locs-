/**
 * useZoneContext — Reactive hook that resolves current user location to a zone.
 * Now uses ONLY locationStore as the single source of truth.
 */
import { useEffect, useState } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { resolveZoneContext, type ZoneContext } from "@/lib/geo/zoneResolver";

export function useZoneContext() {
  const [ctx, setCtx] = useState<ZoneContext | null>(null);
  const [loading, setLoading] = useState(true);

  const lat = useLocationStore((s) => s.currentLocation?.lat ?? null);
  const lng = useLocationStore((s) => s.currentLocation?.lng ?? null);

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
