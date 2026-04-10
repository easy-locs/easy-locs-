/**
 * pricing-engine — Computes dynamic ride price from distance, duration, zone context.
 * Currency: AED (locked per mandatory-currency-locking-policy).
 */

export interface PricingInput {
  distanceKm: number;
  durationMin: number;
  zone: {
    demand: number;
    supply: number;
    traffic: "low" | "moderate" | "heavy";
  };
}

export interface PricingResult {
  finalPrice: number;
  surge: number;
}

export function computeRidePrice(input: PricingInput): PricingResult {
  const baseFare = 5;
  const perKm = 2.2;
  const perMin = 0.5;

  let price = baseFare + input.distanceKm * perKm + input.durationMin * perMin;

  // Traffic multiplier
  if (input.zone.traffic === "heavy") price *= 1.15;

  // Surge (demand vs supply)
  const ratio = input.zone.demand / Math.max(input.zone.supply, 1);
  let surge = 1;
  if (ratio > 3) surge = 2;
  else if (ratio > 2) surge = 1.5;
  else if (ratio > 1.5) surge = 1.2;

  price *= surge;

  return { finalPrice: Math.round(price), surge };
}
