/**
 * predict-demand — Time/day-based demand prediction engine.
 */

export function predictDemand(params: {
  currentDemand: number;
  hour: number;
  dayOfWeek: number;
  recentCompletions?: number;
}) {
  const {
    currentDemand,
    hour,
    dayOfWeek,
    recentCompletions = 0,
  } = params;

  let multiplier = 1;

  // Rush hours
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 21)) multiplier += 0.35;
  // Late night
  if (hour >= 23 || hour <= 2) multiplier += 0.2;
  // Weekend
  if (dayOfWeek === 5 || dayOfWeek === 6) multiplier += 0.18;

  multiplier += Math.min(0.25, recentCompletions * 0.01);

  return +(currentDemand * multiplier).toFixed(2);
}
