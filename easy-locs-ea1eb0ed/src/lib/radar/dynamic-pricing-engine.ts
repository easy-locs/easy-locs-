/**
 * Dynamic Pricing Engine — Multi-variable pricing fed by Radar Brain.
 * Combines base price with traffic, weather, demand, distance, and time factors.
 */

export interface PricingContext {
  baseFee: number;
  distanceKm: number;
  feePerKm: number;
  trafficFactor: number;        // from geo_live_context
  weatherFactor: number;        // from geo_live_context
  demandMultiplier: number;     // from geo_live_context / prediction
  riderSupplyFactor: number;    // from geo_live_context
  surgeMultiplier: number;      // from radar brain decision
  isScheduled: boolean;
  currency: string;
}

export interface PricingResult {
  subtotal: number;
  deliveryFee: number;
  surgeFee: number;
  weatherSurcharge: number;
  totalEstimate: number;
  currency: string;
  breakdown: PricingBreakdownItem[];
  isSurging: boolean;
  surgePercentage: number;
}

export interface PricingBreakdownItem {
  label: string;
  amount: number;
  type: "base" | "distance" | "surge" | "weather" | "discount";
}

/**
 * Compute dynamic delivery/ride price.
 * 
 * Formula:
 * price = (baseFee + distanceKm * feePerKm) 
 *         * trafficAdjustment 
 *         * weatherAdjustment 
 *         * demandAdjustment 
 *         * surgeMultiplier
 */
export function computeDynamicPrice(ctx: PricingContext): PricingResult {
  const {
    baseFee, distanceKm, feePerKm,
    trafficFactor, weatherFactor,
    demandMultiplier, surgeMultiplier,
    isScheduled, currency,
  } = ctx;

  // Base distance fee
  const distanceFee = distanceKm * feePerKm;
  const rawFee = baseFee + distanceFee;

  // Traffic adjustment: slower traffic = slightly higher fee (longer ride)
  const trafficAdj = trafficFactor < 0.7 ? 1 + (1 - trafficFactor) * 0.3 : 1.0;

  // Weather adjustment
  let weatherSurcharge = 0;
  const weatherAdj = weatherFactor < 0.8 ? 1 + (1 - weatherFactor) * 0.25 : 1.0;
  if (weatherAdj > 1.0) {
    weatherSurcharge = rawFee * (weatherAdj - 1);
  }

  // Demand adjustment (capped at 1.5x)
  const demandAdj = Math.min(1.5, demandMultiplier);

  // Surge from radar brain
  const effectiveSurge = Math.min(2.0, surgeMultiplier);

  // Scheduled orders get discount on surge
  const scheduleDiscount = isScheduled ? 0.85 : 1.0;

  // Final calculation
  const adjustedFee = rawFee * trafficAdj * weatherAdj * demandAdj * effectiveSurge * scheduleDiscount;
  const surgeFee = adjustedFee - rawFee;

  const breakdown: PricingBreakdownItem[] = [
    { label: "Base fee", amount: round(baseFee), type: "base" },
    { label: `Distance (${distanceKm.toFixed(1)} km)`, amount: round(distanceFee), type: "distance" },
  ];

  if (surgeFee > 0.5) {
    breakdown.push({ label: "Demand surge", amount: round(surgeFee - weatherSurcharge), type: "surge" });
  }
  if (weatherSurcharge > 0.1) {
    breakdown.push({ label: "Weather surcharge", amount: round(weatherSurcharge), type: "weather" });
  }
  if (isScheduled && effectiveSurge > 1.0) {
    breakdown.push({ label: "Scheduled discount", amount: round(-(adjustedFee * 0.15)), type: "discount" });
  }

  const isSurging = effectiveSurge > 1.05 || demandAdj > 1.1;
  const surgePercentage = Math.round((Math.max(effectiveSurge, demandAdj) - 1) * 100);

  return {
    subtotal: round(rawFee),
    deliveryFee: round(adjustedFee),
    surgeFee: round(Math.max(0, surgeFee)),
    weatherSurcharge: round(weatherSurcharge),
    totalEstimate: round(adjustedFee),
    currency,
    breakdown,
    isSurging,
    surgePercentage: Math.max(0, surgePercentage),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build pricing context from radar brain state.
 */
export function buildPricingContextFromRadar(params: {
  baseFee: number;
  distanceKm: number;
  feePerKm: number;
  geoContext: { traffic_speed_factor: number; weather_speed_factor: number; demand_multiplier: number; rider_supply_factor: number } | null;
  surgeMultiplier: number;
  isScheduled: boolean;
  currency: string;
}): PricingContext {
  return {
    baseFee: params.baseFee,
    distanceKm: params.distanceKm,
    feePerKm: params.feePerKm,
    trafficFactor: params.geoContext?.traffic_speed_factor ?? 1.0,
    weatherFactor: params.geoContext?.weather_speed_factor ?? 1.0,
    demandMultiplier: params.geoContext?.demand_multiplier ?? 1.0,
    riderSupplyFactor: params.geoContext?.rider_supply_factor ?? 1.0,
    surgeMultiplier: params.surgeMultiplier,
    isScheduled: params.isScheduled,
    currency: params.currency,
  };
}
