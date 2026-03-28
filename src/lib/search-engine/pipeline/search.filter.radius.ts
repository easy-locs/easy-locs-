/**
 * search.filter.radius — Applies geo-distance filtering to results.
 */
import type { SearchResult } from "../search-types";
import { haversineKm } from "./search.geo.distance";

export function applyRadiusFilter(
  results: SearchResult[],
  lat: number | undefined,
  lng: number | undefined,
  radiusKm: number
): SearchResult[] {
  if (!lat || !lng) return results;

  return results
    .map((r) => {
      if (r.lat && r.lng) {
        r.distanceKm = haversineKm(lat, lng, r.lat, r.lng);
      }
      return r;
    })
    .filter((r) => !r.distanceKm || r.distanceKm <= radiusKm);
}
