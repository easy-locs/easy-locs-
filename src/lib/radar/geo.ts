import { getTimeContext, timeRelevanceScore } from "@/lib/discovery/timeContext";
import { hierarchyMatchScore } from "@/lib/taxonomy/world-class-taxonomy";

export function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Premium ranking formula for "smart" mode.
 * Combines: proximity (30%), hierarchy relevance (15%), time (15%),
 * rating quality (20%), review volume (10%), sponsorship (10%).
 */
function smartScore(p: {
  distanceKm: number;
  _timeScore: number;
  _hierarchyScore: number;
  rating?: number | null;
  reviewsCount?: number | null;
  isSponsored?: boolean;
}): number {
  // Proximity: 0–30 (closer = higher, decays over 13km)
  const proxScore = Math.max(0, 30 - p.distanceKm * 2.3);

  // Hierarchy relevance: 0–15 (exact sub=15, cluster=10, vertical=5, none=0)
  const hierarchyScore = p._hierarchyScore * 5; // 3*5=15, 2*5=10, 1*5=5

  // Time relevance: 0–15
  const timeScore = p._timeScore * 15;

  // Rating quality: 0–20 (rating out of 5 → scaled)
  const ratingScore = ((p.rating ?? 0) / 5) * 20;

  // Review volume: 0–10 (logarithmic, caps around 200 reviews)
  const reviewScore = Math.min(10, Math.log2((p.reviewsCount ?? 0) + 1) * 1.3);

  // Sponsorship boost: 0 or 10
  const sponsorScore = p.isSponsored ? 10 : 0;

  return proxScore + hierarchyScore + timeScore + ratingScore + reviewScore + sponsorScore;
}

export interface SortRadarOpts {
  /** Target subcategory for hierarchy scoring */
  targetSubcategory?: string | null;
  /** Target vertical for hierarchy scoring */
  targetVertical?: string | null;
}

export function sortRadarPoints<T extends {
  lat: number; lng: number;
  rating?: number | null;
  reviewsCount?: number | null;
  isSponsored?: boolean;
  subcategory?: string | null;
  timeScore?: number;
}>(
  points: T[],
  user: { lat: number; lng: number } | null,
  mode: "nearest" | "best" | "trending" | "smart" = "nearest",
  opts?: SortRadarOpts
): (T & { distanceKm: number })[] {
  const timeCtx = getTimeContext();
  const { targetSubcategory, targetVertical } = opts ?? {};

  const enriched = points.map((p) => ({
    ...p,
    distanceKm: user ? haversineKm(user.lat, user.lng, p.lat, p.lng) : 9999,
    _timeScore: p.timeScore ?? timeRelevanceScore(p.subcategory, timeCtx),
    _hierarchyScore: hierarchyMatchScore(p.subcategory, targetSubcategory, targetVertical),
  }));

  if (mode === "best") {
    return enriched.sort((a, b) =>
      b._hierarchyScore - a._hierarchyScore ||
      (b.rating ?? 0) - (a.rating ?? 0) ||
      (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0) ||
      a.distanceKm - b.distanceKm
    );
  }
  if (mode === "trending") {
    return enriched.sort((a, b) => {
      const aT = (a.isSponsored ? 50 : 0) + (a.reviewsCount ?? 0) * 0.5 + (a.rating ?? 0) * 3 + a._hierarchyScore * 5;
      const bT = (b.isSponsored ? 50 : 0) + (b.reviewsCount ?? 0) * 0.5 + (b.rating ?? 0) * 3 + b._hierarchyScore * 5;
      return bT - aT || a.distanceKm - b.distanceKm;
    });
  }
  if (mode === "smart") {
    return enriched.sort((a, b) => smartScore(b) - smartScore(a));
  }
  // nearest — still prefer hierarchy matches at equal distance
  return enriched.sort((a, b) => a.distanceKm - b.distanceKm || b._hierarchyScore - a._hierarchyScore);
}
