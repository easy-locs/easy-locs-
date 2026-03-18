/**
 * Re-Rank Drivers — Adjust scores based on rejection/timeout history and movement.
 */

export interface ReRankDriver {
  id: string;
  distance: number;
  rating: number;
  acceptance_rate?: number;
  recent_reject?: boolean;
  recent_timeout?: boolean;
  moving_toward_pickup?: boolean;
}

export function reRankDrivers(drivers: ReRankDriver[]) {
  return [...drivers]
    .map((d) => {
      const distanceScore = 1 / Math.max(d.distance, 0.1);
      const ratingScore = (d.rating ?? 4) / 5;
      const acceptanceScore = d.acceptance_rate ?? 0.85;
      const rejectPenalty = d.recent_reject ? 0.25 : 0;
      const timeoutPenalty = d.recent_timeout ? 0.15 : 0;
      const movementBonus = d.moving_toward_pickup ? 0.10 : 0;

      const score =
        distanceScore * 0.50 +
        ratingScore * 0.20 +
        acceptanceScore * 0.20 +
        movementBonus -
        rejectPenalty -
        timeoutPenalty;

      return { ...d, score };
    })
    .sort((a, b) => b.score - a.score);
}
