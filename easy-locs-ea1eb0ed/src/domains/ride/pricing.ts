import type { RideVehicleType, RideEstimate, PriceBreakdown } from "./ports";

interface PricingTier {
  baseFare: number;
  perKm: number;
  perMin: number;
  minFare: number;
}

const PRICING_GRID: Record<RideVehicleType, PricingTier> = {
  economy: { baseFare: 5, perKm: 1.20, perMin: 0.30, minFare: 10 },
  comfort: { baseFare: 8, perKm: 2.00, perMin: 0.50, minFare: 15 },
  premium: { baseFare: 15, perKm: 3.50, perMin: 1.00, minFare: 25 },
};

const ROUTE_FACTOR = 1.3;
const URBAN_SPEED_KMH = 30;
const DEFAULT_SURGE = 1.0;
const COMMISSION_RATE = 0.15;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateEstimate(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  vehicleType: RideVehicleType,
  surgeMultiplier: number = DEFAULT_SURGE
): RideEstimate {
  const tier = PRICING_GRID[vehicleType];
  const straightLine = haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const distance = straightLine * ROUTE_FACTOR;
  const estimatedMinutes = (distance / URBAN_SPEED_KMH) * 60;

  const distanceFare = distance * tier.perKm;
  const timeFare = estimatedMinutes * tier.perMin;
  const rawPrice = tier.baseFare + distanceFare + timeFare;
  const surgeFare = surgeMultiplier > 1 ? rawPrice * (surgeMultiplier - 1) : 0;
  const finalPrice = Math.max(
    Math.round((rawPrice + surgeFare) * 100) / 100,
    tier.minFare
  );

  return {
    estimatedPrice: Math.round(finalPrice * 100) / 100,
    estimatedDuration: Math.round(estimatedMinutes),
    distanceKm: Math.round(distance * 10) / 10,
    breakdown: {
      baseFare: tier.baseFare,
      distanceFare: Math.round(distanceFare * 100) / 100,
      timeFare: Math.round(timeFare * 100) / 100,
      surgeFare: Math.round(surgeFare * 100) / 100,
    },
    surgeMultiplier,
    currency: "AED",
  };
}

export function calculateFinalFare(
  distanceKm: number,
  durationMinutes: number,
  vehicleType: RideVehicleType,
  surgeMultiplier: number = DEFAULT_SURGE
): { totalFare: number; breakdown: PriceBreakdown } {
  const tier = PRICING_GRID[vehicleType];
  const distanceFare = distanceKm * tier.perKm;
  const timeFare = durationMinutes * tier.perMin;
  const rawPrice = tier.baseFare + distanceFare + timeFare;
  const surgeFare = surgeMultiplier > 1 ? rawPrice * (surgeMultiplier - 1) : 0;
  const totalFare = Math.max(
    Math.round((rawPrice + surgeFare) * 100) / 100,
    tier.minFare
  );

  return {
    totalFare,
    breakdown: {
      baseFare: tier.baseFare,
      distanceFare: Math.round(distanceFare * 100) / 100,
      timeFare: Math.round(timeFare * 100) / 100,
      surgeFare: Math.round(surgeFare * 100) / 100,
    },
  };
}

export function calculateCommission(grossAmount: number): number {
  return Math.round(grossAmount * COMMISSION_RATE * 100) / 100;
}

export { PRICING_GRID, COMMISSION_RATE };
