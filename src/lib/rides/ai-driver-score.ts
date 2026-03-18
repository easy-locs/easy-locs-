/**
 * ai-driver-score — AI-weighted driver scoring for dispatch ranking.
 */

export type AIDriver = {
  id: string;
  lat: number;
  lng: number;
  rating?: number;
  acceptance_rate?: number;
  cancel_rate?: number;
  recent_reject?: boolean;
  recent_timeout?: boolean;
  moving_toward_pickup?: boolean;
  vehicle_class?: "eco" | "standard" | "premium";
  distance?: number;
  eta?: number;
  status?: string;
  score?: number;
};

export function scoreAIDriver(params: {
  driver: AIDriver;
  requestedRideType: "eco" | "standard" | "premium" | "any";
  riderPriority?: "standard" | "priority" | "vip";
}) {
  const { driver, requestedRideType, riderPriority = "standard" } = params;

  const distanceScore = 1 / Math.max(driver.distance ?? 1, 0.1);
  const etaScore = 1 / Math.max(driver.eta ?? 5, 1);
  const ratingScore = (driver.rating ?? 4.5) / 5;
  const acceptScore = driver.acceptance_rate ?? 0.85;
  const cancelPenalty = driver.cancel_rate ?? 0.05;
  const rejectPenalty = driver.recent_reject ? 0.15 : 0;
  const timeoutPenalty = driver.recent_timeout ? 0.1 : 0;
  const headingBonus = driver.moving_toward_pickup ? 0.12 : 0;

  const classBonus =
    requestedRideType === "any"
      ? 0
      : driver.vehicle_class === requestedRideType
      ? 0.15
      : 0;

  const priorityBonus =
    riderPriority === "vip" ? 0.12 :
    riderPriority === "priority" ? 0.06 :
    0;

  const score =
    distanceScore * 0.34 +
    etaScore * 0.22 +
    ratingScore * 0.16 +
    acceptScore * 0.18 +
    classBonus +
    headingBonus +
    priorityBonus -
    cancelPenalty * 0.2 -
    rejectPenalty -
    timeoutPenalty;

  return +score.toFixed(6);
}
