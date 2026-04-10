/**
 * pricing-ai-engine — Multi-factor dynamic pricing with surge, traffic, weather, demand.
 */

type PricingAIInput = {
  jobId?: string;
  zoneKey?: string | null;
  distanceKm: number;
  durationMin: number;
  zone: {
    demand: number;
    supply: number;
    traffic: "low" | "moderate" | "heavy";
    weather?: "clear" | "rain" | "storm" | "heat";
  };
};

export interface PricingAIResult {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  demandMultiplier: number;
  trafficMultiplier: number;
  weatherMultiplier: number;
  surgeMultiplier: number;
  finalPrice: number;
  explanation_json: Record<string, any>;
}

export function computeAIPricing(input: PricingAIInput): PricingAIResult {
  const baseFare = 6;
  const distanceFare = input.distanceKm * 2.4;
  const timeFare = input.durationMin * 0.55;

  const demandRatio = input.zone.demand / Math.max(input.zone.supply, 1);
  let demandMultiplier = 1;
  if (demandRatio > 3.2) demandMultiplier = 1.8;
  else if (demandRatio > 2.5) demandMultiplier = 1.45;
  else if (demandRatio > 1.8) demandMultiplier = 1.25;
  else if (demandRatio > 1.3) demandMultiplier = 1.1;

  let trafficMultiplier = 1;
  if (input.zone.traffic === "moderate") trafficMultiplier = 1.08;
  if (input.zone.traffic === "heavy") trafficMultiplier = 1.18;

  let weatherMultiplier = 1;
  if (input.zone.weather === "rain") weatherMultiplier = 1.06;
  if (input.zone.weather === "storm") weatherMultiplier = 1.15;
  if (input.zone.weather === "heat") weatherMultiplier = 1.04;

  const surgeMultiplier = Number(
    (demandMultiplier * trafficMultiplier * weatherMultiplier).toFixed(2),
  );

  const raw = (baseFare + distanceFare + timeFare) * surgeMultiplier;
  const finalPrice = Math.max(8, Math.round(raw));

  return {
    baseFare,
    distanceFare: Number(distanceFare.toFixed(2)),
    timeFare: Number(timeFare.toFixed(2)),
    demandMultiplier,
    trafficMultiplier,
    weatherMultiplier,
    surgeMultiplier,
    finalPrice,
    explanation_json: {
      demand_ratio: Number(demandRatio.toFixed(2)),
      zone: input.zone,
    },
  };
}
