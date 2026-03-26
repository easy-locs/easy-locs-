/**
 * Unified Pricing Engine — single pricing core for all mobility contexts.
 */
import { getMobilityProfile } from "./mobility-profiles";
import { normalizeZoneContext } from "./unified-zone-normalizer";
import type {
  UnifiedMobilityJobInput,
  UnifiedPricingResult,
} from "./unified-mobility.types";

function computeDemandMultiplier(demand: number, supply: number) {
  const ratio = demand / Math.max(supply, 1);
  let demandMultiplier = 1;
  if (ratio > 3.2) demandMultiplier = 1.8;
  else if (ratio > 2.5) demandMultiplier = 1.45;
  else if (ratio > 1.8) demandMultiplier = 1.25;
  else if (ratio > 1.3) demandMultiplier = 1.1;
  return { ratio, demandMultiplier };
}

function computeTrafficMultiplier(traffic: string) {
  if (traffic === "heavy") return 1.18;
  if (traffic === "moderate") return 1.08;
  return 1;
}

function computeWeatherMultiplier(weather: string) {
  if (weather === "storm") return 1.15;
  if (weather === "rain") return 1.06;
  if (weather === "heat") return 1.04;
  return 1;
}

function computeServiceMultiplier(context: string, serviceLevel?: string | null) {
  if (context === "taxi" && serviceLevel?.includes("premium")) return 1.25;
  if (context === "taxi" && serviceLevel?.includes("xl")) return 1.35;
  if (context === "parcel") return 1.1;
  if (context === "errand") return 1.15;
  return 1;
}

export function computeUnifiedPricing(params: {
  job: UnifiedMobilityJobInput;
  distanceKm: number;
  durationMin: number;
}): UnifiedPricingResult {
  const profile = getMobilityProfile(params.job.context);
  const zone = normalizeZoneContext(params.job.zone);

  const baseFare = profile.baseFare;
  const distanceFare = params.distanceKm * profile.perKm;
  const timeFare = params.durationMin * profile.perMinute;

  const { ratio, demandMultiplier } = computeDemandMultiplier(zone.demand, zone.supply);
  const trafficMultiplier = computeTrafficMultiplier(zone.traffic);
  const weatherMultiplier = computeWeatherMultiplier(zone.weather);
  const serviceMultiplier = computeServiceMultiplier(params.job.context, params.job.serviceLevel);

  const merchantPrepFee =
    profile.allowMerchantPrep && zone.merchantPrepMinutes
      ? zone.merchantPrepMinutes * profile.merchantPrepFeePerMin
      : 0;

  const surgeMultiplier = Number(
    (demandMultiplier * trafficMultiplier * weatherMultiplier * serviceMultiplier).toFixed(2),
  );

  const raw = (baseFare + distanceFare + timeFare + merchantPrepFee) * surgeMultiplier;
  const finalPrice = Math.max(profile.minFare, Math.round(raw));

  return {
    baseFare,
    distanceFare: Number(distanceFare.toFixed(2)),
    timeFare: Number(timeFare.toFixed(2)),
    demandMultiplier,
    trafficMultiplier,
    weatherMultiplier,
    serviceMultiplier,
    surgeMultiplier,
    merchantPrepFee: Number(merchantPrepFee.toFixed(2)),
    finalPrice,
    explanation_json: {
      context: params.job.context,
      demand_ratio: Number(ratio.toFixed(2)),
      zone,
      service_level: params.job.serviceLevel ?? null,
    },
  };
}
