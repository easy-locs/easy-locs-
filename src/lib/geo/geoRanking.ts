/**
 * GeoRanking — Sort and filter GeoEntities by proximity, rating, availability.
 */
import type { GeoEntity } from "./geoEntityAdapter";
import { haversine } from "@/lib/radar/radar-engine";

export type SortMode = "nearest" | "best_rated" | "trending";

export interface RankingOptions {
  userLat: number;
  userLng: number;
  radiusKm?: number;
  types?: GeoEntity["type"][];
  statusFilter?: ("open" | "available")[];
  sortBy?: SortMode;
  limit?: number;
}

/** Enrich entities with distance and ETA, then rank */
export function rankGeoEntities(entities: GeoEntity[], opts: RankingOptions): GeoEntity[] {
  const { userLat, userLng, radiusKm = 50, types, statusFilter, sortBy = "nearest", limit = 50 } = opts;

  let result = entities
    .map(e => ({
      ...e,
      distance_m: haversine(userLat, userLng, e.lat, e.lng) * 1000,
      eta_min: Math.max(1, Math.round((haversine(userLat, userLng, e.lat, e.lng) / 30) * 60)),
    }))
    .filter(e => e.distance_m <= radiusKm * 1000);

  if (types?.length) {
    result = result.filter(e => types.includes(e.type));
  }

  if (statusFilter?.length) {
    result = result.filter(e => e.status && statusFilter.includes(e.status as any));
  }

  switch (sortBy) {
    case "nearest":
      result.sort((a, b) => a.distance_m! - b.distance_m!);
      break;
    case "best_rated":
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "trending":
      result.sort((a, b) => ((b.rating ?? 0) * 10 - b.distance_m! * 0.001) - ((a.rating ?? 0) * 10 - a.distance_m! * 0.001));
      break;
  }

  return result.slice(0, limit);
}

/** Format distance for display */
export function formatGeoDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format ETA for display */
export function formatGeoETA(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}
