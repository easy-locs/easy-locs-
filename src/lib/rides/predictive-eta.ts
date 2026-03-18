/**
 * predictive-eta — Traffic-aware ETA prediction engine.
 */

export function computeTrafficFactor(params: {
  hour: number;
  dayOfWeek: number;
  weatherPenalty?: number;
}) {
  const { hour, dayOfWeek, weatherPenalty = 0 } = params;

  let factor = 1;

  if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 21)) factor += 0.25;
  if (dayOfWeek === 5 || dayOfWeek === 6) factor += 0.12;
  factor += weatherPenalty;

  return +factor.toFixed(2);
}

export function predictETA(params: {
  distanceKm: number;
  avgSpeedKmh?: number;
  trafficFactor?: number;
  driverDelayMin?: number;
}) {
  const {
    distanceKm,
    avgSpeedKmh = 28,
    trafficFactor = 1,
    driverDelayMin = 0,
  } = params;

  const base = (distanceKm / Math.max(avgSpeedKmh, 8)) * 60;
  const eta = base * trafficFactor + driverDelayMin;

  return {
    etaMinutes: Math.max(1, Math.round(eta)),
    distanceKm: +distanceKm.toFixed(2),
    trafficFactor,
  };
}
