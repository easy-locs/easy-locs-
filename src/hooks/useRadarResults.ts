/**
 * useRadarResults — Combine geo entities + user location → ranked nearby results.
 */
import { useMemo } from "react";
import { useGeolocation } from "./useGeolocation";
import { useGeoEntities } from "./useGeoEntities";
import { rankGeoEntities, type SortMode } from "@/lib/geo/geoRanking";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

export function useRadarResults(opts?: {
  types?: GeoEntity["type"][];
  radiusKm?: number;
  sortBy?: SortMode;
  limit?: number;
}) {
  const { types, radiusKm = 20, sortBy = "nearest", limit = 50 } = opts || {};
  const geo = useGeolocation();
  const { entities } = useGeoEntities({ types });

  const userLat = geo.lat ?? 25.2048; // Dubai fallback
  const userLng = geo.lng ?? 55.2708;

  const ranked = useMemo(() => {
    if (!entities.length) return [];
    return rankGeoEntities(entities, {
      userLat,
      userLng,
      radiusKm,
      types,
      sortBy,
      limit,
    });
  }, [entities, userLat, userLng, radiusKm, types, sortBy, limit]);

  return {
    results: ranked,
    userLat,
    userLng,
    geo,
    entityCount: entities.length,
  };
}
