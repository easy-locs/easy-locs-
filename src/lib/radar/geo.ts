import { getTimeContext, timeRelevanceScore } from "@/lib/discovery/timeContext";
import { hierarchyMatchScore } from "@/lib/taxonomy/world-class-taxonomy";

import { haversineKm } from "@/lib/geo/distance";
export { haversineKm } from "@/lib/geo/distance";

/**
 * Premium ranking formula for "smart" mode.
 * Combines: proximity (25%), hierarchy relevance (15%), time (12%),
 * rating quality (18%), review volume (8%), sponsorship (10%),
 * profile completeness (12%).
 */
function smartScore(p: {
  distanceKm: number;
  _timeScore: number;
  _hierarchyScore: number;
  _profileScore: number;
  rating?: number | null;
  reviewsCount?: number | null;
  isSponsored?: boolean;
}): number {
  // Proximity: 0–25 (closer = higher, decays over 11km)
  const proxScore = Math.max(0, 25 - p.distanceKm * 2.3);

  // Hierarchy relevance: 0–15 (exact sub=15, cluster=10, vertical=5, none=0)
  const hierarchyScore = p._hierarchyScore * 5;

  // Time relevance: 0–12
  const timeScore = p._timeScore * 12;

  // Rating quality: 0–18
  const ratingScore = ((p.rating ?? 0) / 5) * 18;

  // Review volume: 0–8
  const reviewScore = Math.min(8, Math.log2((p.reviewsCount ?? 0) + 1) * 1.1);

  // Sponsorship boost: 0 or 10
  const sponsorScore = p.isSponsored ? 10 : 0;

  // Profile completeness: 0–12
  const profileScore = p._profileScore * 12;

  return proxScore + hierarchyScore + timeScore + ratingScore + reviewScore + sponsorScore + profileScore;
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
  imageUrl?: string | null;
  subtitle?: string | null;
}>(
  points: T[],
  user: { lat: number; lng: number } | null,
  mode: "nearest" | "best" | "trending" | "smart" = "nearest",
  opts?: SortRadarOpts
): (T & { distanceKm: number })[] {
  const timeCtx = getTimeContext();
  const { targetSubcategory, targetVertical } = opts ?? {};

  const enriched = points.map((p) => {
    // Profile completeness: 0–1 based on how many fields are populated
    let completeness = 0;
    if (p.rating && p.rating > 0) completeness += 0.25;
    if (p.reviewsCount && p.reviewsCount > 0) completeness += 0.2;
    if (p.imageUrl) completeness += 0.25;
    if (p.subtitle) completeness += 0.15;
    if (p.subcategory) completeness += 0.15;

    return {
      ...p,
      distanceKm: user ? haversineKm(user.lat, user.lng, p.lat, p.lng) : 9999,
      _timeScore: p.timeScore ?? timeRelevanceScore(p.subcategory, timeCtx),
      _hierarchyScore: hierarchyMatchScore(p.subcategory, targetSubcategory, targetVertical),
      _profileScore: completeness,
    };
  });

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
