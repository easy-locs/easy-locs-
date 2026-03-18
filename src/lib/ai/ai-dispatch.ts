/**
 * AI Dispatch — Smart driver selection scoring.
 * Combines proximity, rating, and reliability for optimal matching.
 */

interface ScoredDriver {
  id: string;
  distance: number;
  rating: number;
  acceptance_rate?: number;
  [key: string]: unknown;
}

export function aiSelectDriver<T extends ScoredDriver>(drivers: T[]): (T & { finalScore: number }) | null {
  if (!drivers.length) return null;

  const scored = drivers.map(d => {
    const distanceScore = 1 / (d.distance + 0.1);
    const ratingScore = (d.rating || 4.5) / 5;
    const reliability = d.acceptance_rate ?? 0.9;

    const finalScore =
      distanceScore * 0.5 +
      ratingScore * 0.3 +
      reliability * 0.2;

    return { ...d, finalScore };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored[0];
}
