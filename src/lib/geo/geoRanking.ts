/**
 * geoRanking — Minimal formatting helpers for geo distances.
 */
export type SortMode = "nearest" | "best_rated" | "trending";

export function formatGeoDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatGeoETA(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 80));
  return `${minutes} min`;
}
