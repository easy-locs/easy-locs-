/**
 * useRadarResults — Combine geo entities + user location → zone-aware ranked results.
 * Now uses locationStore as single source + zone-aware ranking.
 */
import { useMemo } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useGeoEntities } from "./useGeoEntities";
import { useZoneContext } from "./useZoneContext";
import { rankByZone, type RankableEntity } from "@/lib/zones/zoneAwareRanking";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

export function useRadarResults(opts?: {
  types?: GeoEntity["type"][];
  radiusKm?: number;
  sortBy?: "nearest" | "best_rated" | "trending";
  limit?: number;
}) {
  const { types, radiusKm = 20, limit = 50 } = opts || {};
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const { entities } = useGeoEntities({ types });
  const zone = useZoneContext();

  const userLat = currentLocation?.lat ?? 25.2048;
  const userLng = currentLocation?.lng ?? 55.2708;

  const ranked = useMemo(() => {
    if (!entities.length) return [];

    // Adapt GeoEntity to RankableEntity for zone-aware ranking
    const rankable: (RankableEntity & GeoEntity)[] = entities.map((e) => ({
      ...e,
      zone_id: (e as any).zone_id ?? null,
      created_at: (e as any).created_at ?? null,
      boost_multiplier: (e as any).boost_multiplier ?? null,
      boost_enabled: (e as any).boost_enabled ?? false,
      boost_expires_at: (e as any).boost_expires_at ?? null,
      is_open: (e as any).is_open ?? true,
      order_count: (e as any).order_count ?? 0,
    }));

    return rankByZone(rankable, userLat, userLng, zone.zoneId ?? null, { radiusKm, limit });
  }, [entities, userLat, userLng, zone.zoneId, radiusKm, limit]);

  return {
    results: ranked,
    userLat,
    userLng,
    geo: { lat: currentLocation?.lat, lng: currentLocation?.lng, loading: false },
    entityCount: entities.length,
    accuracyLevel: useLocationStore.getState().accuracyLevel,
    zoneId: zone.zoneId,
    zoneName: zone.zone?.name ?? null,
  };
}
