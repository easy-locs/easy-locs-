/**
 * AI Pricing — Dynamic pricing based on demand/supply ratio.
 * Integrates with fare-engine's computeSurge for consistency.
 */
import { computeSurge } from "@/lib/fare-engine";

export interface AIPricingResult {
  price: number;
  multiplier: number;
  tier: "normal" | "busy" | "surge" | "peak";
}

export function aiPricing({
  demand,
  supply,
  basePrice,
}: {
  demand: number;
  supply: number;
  basePrice: number;
}): AIPricingResult {
  const multiplier = computeSurge(demand, supply);

  const tier: AIPricingResult["tier"] =
    multiplier >= 2 ? "peak" :
    multiplier >= 1.5 ? "surge" :
    multiplier > 1 ? "busy" : "normal";

  return {
    price: Math.round(basePrice * multiplier * 100) / 100,
    multiplier,
    tier,
  };
}
