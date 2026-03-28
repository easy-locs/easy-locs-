/**
 * Live Mobility — Visibility scoring (pure function).
 */
export function computeVisibilityScore(params: {
  deliversHere: boolean;
  isOpen: boolean;
  etaMinutes: number | null;
  rating?: number;
  queueLoad?: number;
  riderSupplyFactor?: number;
  hasPromo?: boolean;
  trafficFactor?: number;
  weatherFactor?: number;
  capacityScore?: number;
}): number {
  const {
    deliversHere, isOpen, etaMinutes,
    rating = 4.0, queueLoad = 0,
    riderSupplyFactor = 1.0, hasPromo = false,
    trafficFactor = 1.0, weatherFactor = 1.0,
    capacityScore = 1.0,
  } = params;

  if (!deliversHere) return 0;
  if (!isOpen) return 5;

  let score = 30;

  if (etaMinutes != null) {
    score += Math.max(0, 25 - Math.floor(etaMinutes / 3));
  }

  score += Math.min(15, Math.round((rating / 5) * 15));

  const queuePenalty = Math.min(10, queueLoad * 2);
  score += 10 - queuePenalty;

  score += Math.round(Math.min(10, riderSupplyFactor * 10));

  if (hasPromo) score += 5;

  score += Math.round(Math.min(5, capacityScore * 5));

  if (trafficFactor < 0.6) score -= 5;
  if (weatherFactor < 0.7) score -= 5;

  return Math.max(0, Math.min(100, score));
}
