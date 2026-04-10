/**
 * Real Estate Ranking Engine
 * Score = freshness + proximity + boost + engagement.
 */
import { haversineKm as haversine } from "@/lib/geo/distance";
import { computeFreshnessScore } from "./listingLifecycle";

export interface RankableListing {
  id: string;
  lat?: number | null;
  lng?: number | null;
  published_at?: string | null;
  boost_enabled?: boolean;
  boost_multiplier?: number;
  boost_expires_at?: string | null;
  freshness_score?: number;
  rating_avg?: number | null;
  rating_count?: number | null;
  price?: number;
}

export interface RankedListing extends RankableListing {
  rankScore: number;
  distanceKm: number | null;
  boostActive: boolean;
}

const WEIGHTS = {
  freshness: 0.35,
  proximity: 0.35,
  boost: 0.20,
  engagement: 0.10,
};

function normalizeProximity(distanceKm: number, maxKm = 50): number {
  return Math.max(0, 1 - distanceKm / maxKm);
}

function isBoostActive(l: RankableListing): boolean {
  if (!l.boost_enabled) return false;
  if (!l.boost_expires_at) return false;
  return new Date(l.boost_expires_at).getTime() > Date.now();
}

function engagementScore(l: RankableListing): number {
  const rating = l.rating_avg ?? 0;
  const count = l.rating_count ?? 0;
  if (count === 0) return 0.3; // neutral baseline
  return Math.min(1, (rating / 5) * 0.7 + Math.min(count / 50, 1) * 0.3);
}

/**
 * Rank listings by freshness + proximity + boost + engagement.
 */
export function rankListings(
  listings: RankableListing[],
  userLat?: number,
  userLng?: number,
  opts?: { maxDistanceKm?: number; limit?: number }
): RankedListing[] {
  const maxKm = opts?.maxDistanceKm ?? 50;
  const limit = opts?.limit ?? 100;

  const scored: RankedListing[] = listings.map((l) => {
    const freshness = l.freshness_score ?? computeFreshnessScore(l.published_at);

    let distanceKm: number | null = null;
    let proxScore = 0.5; // neutral if no coords
    if (userLat && userLng && l.lat && l.lng) {
      distanceKm = haversine(userLat, userLng, l.lat, l.lng);
      proxScore = normalizeProximity(distanceKm, maxKm);
    }

    const boosted = isBoostActive(l);
    const boostScore = boosted ? Math.min(1, (l.boost_multiplier ?? 1) / 2) : 0;
    const engage = engagementScore(l);

    const rankScore =
      freshness * WEIGHTS.freshness +
      proxScore * WEIGHTS.proximity +
      boostScore * WEIGHTS.boost +
      engage * WEIGHTS.engagement;

    return { ...l, rankScore, distanceKm, boostActive: boosted };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);
  return scored.slice(0, limit);
}
