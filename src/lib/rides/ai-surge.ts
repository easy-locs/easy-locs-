/**
 * ai-surge — AI-powered dynamic surge pricing engine.
 */

export function computeAISurge(params: {
  demand: number;
  supply: number;
  predictedDemand?: number;
  riderPriority?: "standard" | "priority" | "vip";
  weatherPenalty?: number;
  peakHour?: boolean;
}) {
  const {
    demand,
    supply,
    predictedDemand = demand,
    riderPriority = "standard",
    weatherPenalty = 0,
    peakHour = false,
  } = params;

  const liveRatio = demand / Math.max(supply, 1);
  const predictiveRatio = predictedDemand / Math.max(supply, 1);

  let multiplier = 1;

  if (liveRatio > 2.4 || predictiveRatio > 2.6) multiplier = 2.1;
  else if (liveRatio > 1.9 || predictiveRatio > 2.0) multiplier = 1.8;
  else if (liveRatio > 1.5 || predictiveRatio > 1.6) multiplier = 1.5;
  else if (liveRatio > 1.2 || predictiveRatio > 1.25) multiplier = 1.2;

  if (peakHour) multiplier += 0.05;
  if (weatherPenalty > 0) multiplier += weatherPenalty;

  if (riderPriority === "vip") multiplier = Math.max(1, multiplier - 0.1);
  if (riderPriority === "priority") multiplier = Math.max(1, multiplier - 0.05);

  return +Math.min(2.5, Math.max(1, multiplier)).toFixed(2);
}
