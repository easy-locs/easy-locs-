import { getMobilityProfile } from "./mobility-profiles";
import { normalizeZoneContext } from "./unified-zone-normalizer";
import type {
  UnifiedMobilityJobInput,
  UnifiedPricingResult,
} from "./unified-mobility.types";

function computeDemandMultiplier(demand: number, supply: number) {
  const ratio = demand / Math.max(supply, 1);
  let demandMultiplier = 1;
  if (ratio > 4.0) demandMultiplier = 2.0;
  else if (ratio > 3.2) demandMultiplier = 1.8;
  else if (ratio > 2.5) demandMultiplier = 1.45;
  else if (ratio > 1.8) demandMultiplier = 1.25;
  else if (ratio > 1.3) demandMultiplier = 1.1;
  else if (ratio < 0.5) demandMultiplier = 0.9;
  return { ratio, demandMultiplier };
}

function computeTrafficMultiplier(traffic: string) {
  if (traffic === "gridlock") return 1.35;
  if (traffic === "heavy") return 1.22;
  if (traffic === "moderate") return 1.08;
  return 1;
}

function computeWeatherMultiplier(weather: string) {
  if (weather === "storm") return 1.2;
  if (weather === "rain") return 1.08;
  if (weather === "fog") return 1.05;
  if (weather === "heat") return 1.04;
  return 1;
}

function computeServiceMultiplier(context: string, serviceLevel?: string | null) {
  if (context === "taxi") {
    if (serviceLevel?.includes("premium")) return 1.3;
    if (serviceLevel?.includes("xl")) return 1.4;
    if (serviceLevel?.includes("moto")) return 0.75;
  }
  if (context === "parcel") return 1.1;
  if (context === "errand") return 1.15;
  return 1;
}

function computeTimeOfDayMultiplier(): number {
  const hour = new Date().getHours();
  if (hour >= 0 && hour <= 5) return 1.15;
  if (hour >= 7 && hour <= 9) return 1.12;
  if (hour >= 17 && hour <= 20) return 1.15;
  if (hour >= 23) return 1.1;
  return 1;
}

function computeDistanceDiscount(distanceKm: number): number {
  if (distanceKm > 50) return 0.85;
  if (distanceKm > 30) return 0.9;
  if (distanceKm > 20) return 0.95;
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
  const timeMultiplier = computeTimeOfDayMultiplier();
  const distanceDiscount = computeDistanceDiscount(params.distanceKm);

  const merchantPrepFee =
    profile.allowMerchantPrep && zone.merchantPrepMinutes
      ? zone.merchantPrepMinutes * profile.merchantPrepFeePerMin
      : 0;

  const surgeMultiplier = Number(
    (demandMultiplier * trafficMultiplier * weatherMultiplier * serviceMultiplier * timeMultiplier * distanceDiscount).toFixed(2),
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
      time_multiplier: timeMultiplier,
      distance_discount: distanceDiscount,
      surge_breakdown: {
        demand: demandMultiplier,
        traffic: trafficMultiplier,
        weather: weatherMultiplier,
        service: serviceMultiplier,
        time: timeMultiplier,
        distance: distanceDiscount,
      },
    },
  };
}

export function computeFareEstimate(params: {
  context: string;
  distanceKm: number;
  durationMin: number;
  demand?: number;
  supply?: number;
  traffic?: string;
}): { low: number; high: number; estimated: number } {
  const profile = getMobilityProfile(params.context as any);
  const baseFare = profile.baseFare;
  const distanceFare = params.distanceKm * profile.perKm;
  const timeFare = params.durationMin * profile.perMinute;
  const raw = baseFare + distanceFare + timeFare;

  const { demandMultiplier } = computeDemandMultiplier(
    params.demand ?? 10,
    params.supply ?? 10,
  );

  const estimated = Math.max(profile.minFare, Math.round(raw * demandMultiplier));
  const low = Math.max(profile.minFare, Math.round(raw * 0.85));
  const high = Math.round(estimated * 1.25);

  return { low, high, estimated };
}
