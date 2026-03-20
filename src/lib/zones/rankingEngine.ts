/**
 * rankingEngine — Calculate ranking score for businesses.
 * Score = weighted combination of distance, rating, activity, freshness, boost.
 */

interface RankInput {
  distanceKm: number;
  rating: number | null;
  orderCount?: number;
  lastActivityDaysAgo?: number;
  boostMultiplier?: number;
  isOpen?: boolean;
}

const WEIGHTS = {
  distance: 0.30,
  rating: 0.25,
  activity: 0.15,
  freshness: 0.15,
  boost: 0.10,
  availability: 0.05,
} as const;

/** Returns a score 0–100. Higher = better rank. */
export function calculateRankingScore(input: RankInput): number {
  // Distance: 0km=100, 10km=0
  const distScore = Math.max(0, 100 - (input.distanceKm * 10));

  // Rating: 0–5 → 0–100
  const ratingScore = (input.rating ?? 3) * 20;

  // Activity: log scale, 0 orders=0, 100+ orders=100
  const activityScore = Math.min(100, (Math.log10((input.orderCount ?? 0) + 1) / 2) * 100);

  // Freshness: 0 days=100, 30+ days=0
  const freshnessScore = Math.max(0, 100 - ((input.lastActivityDaysAgo ?? 30) * 3.33));

  // Boost: multiplier 1.0=50, 2.0=100, 0.5=25
  const boostScore = Math.min(100, (input.boostMultiplier ?? 1) * 50);

  // Availability: open=100, closed=20
  const availScore = input.isOpen !== false ? 100 : 20;

  return (
    distScore * WEIGHTS.distance +
    ratingScore * WEIGHTS.rating +
    activityScore * WEIGHTS.activity +
    freshnessScore * WEIGHTS.freshness +
    boostScore * WEIGHTS.boost +
    availScore * WEIGHTS.availability
  );
}

/** Sort entities by ranking score descending */
export function rankEntities<T extends { _rankScore?: number }>(
  entities: T[],
  scoreFn: (e: T) => number,
): (T & { _rankScore: number })[] {
  return entities
    .map((e) => ({ ...e, _rankScore: scoreFn(e) }))
    .sort((a, b) => b._rankScore - a._rankScore);
}
