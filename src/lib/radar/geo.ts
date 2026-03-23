import { getTimeContext, timeRelevanceScore } from "@/lib/discovery/timeContext";

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
 * Combines: proximity (35%), time relevance (20%), rating quality (25%),
 * review volume (10%), sponsorship (10%).
 */
function smartScore(p: {
  distanceKm: number;
  _timeScore: number;
  rating?: number | null;
  reviewsCount?: number | null;
  isSponsored?: boolean;
}): number {
  // Proximity: 0–35 (closer = higher, decays over 15km)
  const proxScore = Math.max(0, 35 - p.distanceKm * 2.3);

  // Time relevance: 0–20
  const timeScore = p._timeScore * 20;

  // Rating quality: 0–25 (rating out of 5 → scaled)
  const ratingScore = ((p.rating ?? 0) / 5) * 25;

  // Review volume: 0–10 (logarithmic, caps around 200 reviews)
  const reviewScore = Math.min(10, Math.log2((p.reviewsCount ?? 0) + 1) * 1.3);

  // Sponsorship boost: 0 or 10
  const sponsorScore = p.isSponsored ? 10 : 0;

  return proxScore + timeScore + ratingScore + reviewScore + sponsorScore;
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
  mode: "nearest" | "best" | "trending" | "smart" = "nearest"
): (T & { distanceKm: number })[] {
  const timeCtx = getTimeContext();

  const enriched = points.map((p) => ({
    ...p,
    distanceKm: user ? haversineKm(user.lat, user.lng, p.lat, p.lng) : 9999,
    _timeScore: p.timeScore ?? timeRelevanceScore(p.subcategory, timeCtx),
  }));

  if (mode === "best") {
    return enriched.sort((a, b) =>
      (b.rating ?? 0) - (a.rating ?? 0) ||
      (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0) ||
      a.distanceKm - b.distanceKm
    );
  }
  if (mode === "trending") {
    return enriched.sort((a, b) => {
      const aT = (a.isSponsored ? 50 : 0) + (a.reviewsCount ?? 0) * 0.5 + (a.rating ?? 0) * 3;
      const bT = (b.isSponsored ? 50 : 0) + (b.reviewsCount ?? 0) * 0.5 + (b.rating ?? 0) * 3;
      return bT - aT || a.distanceKm - b.distanceKm;
    });
  }
  if (mode === "smart") {
    return enriched.sort((a, b) => smartScore(b) - smartScore(a));
  }
  // nearest
  return enriched.sort((a, b) => a.distanceKm - b.distanceKm);
}
