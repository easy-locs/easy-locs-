/**
 * Mobility Profiles — per-context configuration for pricing, scoring, ETA, dispatch.
 */
import type { MobilityContext } from "./unified-mobility.types";

export interface MobilityProfile {
  code: MobilityContext;

  // pricing
  baseFare: number;
  perKm: number;
  perMinute: number;
  merchantPrepFeePerMin: number;
  minFare: number;

  // scoring weights
  weightDistance: number;
  weightAcceptance: number;
  weightResponse: number;
  weightReliability: number;
  weightZone: number;
  weightActivity: number;
  weightVehicleFit: number;
  weightGpsQuality: number;

  // eta
  roadFactor: number;
  allowMerchantPrep: boolean;

  // dispatch
  wave1Count: number;
  wave2Count: number;
  wave3Count: number;
}

export const MOBILITY_PROFILES: Record<MobilityContext, MobilityProfile> = {
  taxi: {
    code: "taxi",
    baseFare: 6, perKm: 2.4, perMinute: 0.55, merchantPrepFeePerMin: 0, minFare: 8,
    weightDistance: 0.28, weightAcceptance: 0.14, weightResponse: 0.12, weightReliability: 0.16,
    weightZone: 0.08, weightActivity: 0.06, weightVehicleFit: 0.08, weightGpsQuality: 0.08,
    roadFactor: 1.25, allowMerchantPrep: false,
    wave1Count: 3, wave2Count: 5, wave3Count: 8,
  },
  food_delivery: {
    code: "food_delivery",
    baseFare: 5, perKm: 1.9, perMinute: 0.45, merchantPrepFeePerMin: 0.12, minFare: 7,
    weightDistance: 0.22, weightAcceptance: 0.14, weightResponse: 0.12, weightReliability: 0.16,
    weightZone: 0.08, weightActivity: 0.08, weightVehicleFit: 0.06, weightGpsQuality: 0.14,
    roadFactor: 1.35, allowMerchantPrep: true,
    wave1Count: 3, wave2Count: 6, wave3Count: 10,
  },
  grocery_delivery: {
    code: "grocery_delivery",
    baseFare: 6, perKm: 2.0, perMinute: 0.48, merchantPrepFeePerMin: 0.08, minFare: 8,
    weightDistance: 0.24, weightAcceptance: 0.14, weightResponse: 0.12, weightReliability: 0.16,
    weightZone: 0.08, weightActivity: 0.08, weightVehicleFit: 0.06, weightGpsQuality: 0.12,
    roadFactor: 1.35, allowMerchantPrep: true,
    wave1Count: 3, wave2Count: 6, wave3Count: 10,
  },
  parcel: {
    code: "parcel",
    baseFare: 8, perKm: 2.2, perMinute: 0.5, merchantPrepFeePerMin: 0, minFare: 10,
    weightDistance: 0.22, weightAcceptance: 0.12, weightResponse: 0.10, weightReliability: 0.18,
    weightZone: 0.08, weightActivity: 0.06, weightVehicleFit: 0.12, weightGpsQuality: 0.12,
    roadFactor: 1.3, allowMerchantPrep: false,
    wave1Count: 3, wave2Count: 5, wave3Count: 8,
  },
  errand: {
    code: "errand",
    baseFare: 9, perKm: 2.3, perMinute: 0.55, merchantPrepFeePerMin: 0, minFare: 12,
    weightDistance: 0.20, weightAcceptance: 0.12, weightResponse: 0.10, weightReliability: 0.18,
    weightZone: 0.08, weightActivity: 0.06, weightVehicleFit: 0.14, weightGpsQuality: 0.12,
    roadFactor: 1.3, allowMerchantPrep: false,
    wave1Count: 3, wave2Count: 5, wave3Count: 8,
  },
};

export function getMobilityProfile(context: MobilityContext): MobilityProfile {
  return MOBILITY_PROFILES[context];
}
