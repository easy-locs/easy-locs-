/**
 * Profit Protection Engine — fee floors, promo suppression, margin enforcement.
 */
import type { ArbitrationInput, ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function arbitrateProfit(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const minMargin = input.minMarginPercent ?? 8;

  if (!input.pricingResult) return decisions;

  const total = input.pricingResult.totalEstimate;
  const MIN_DELIVERY_FEE = 5;

  if (input.pricingResult.deliveryFee < MIN_DELIVERY_FEE) {
    decisions.push({
      module: "profit", action: "enforce_floor",
      minFee: MIN_DELIVERY_FEE, currency: input.pricingResult.currency,
      reason: `Delivery fee ${input.pricingResult.deliveryFee} below minimum ${MIN_DELIVERY_FEE}`,
      priority: DecisionPriority.PROFITABILITY,
    });
  }

  if (input.station.surge_multiplier > 1.3 && input.activePromoCount && input.activePromoCount > 0) {
    decisions.push({
      module: "profit", action: "suppress_promo",
      reason: `Surge ${input.station.surge_multiplier.toFixed(2)}x active — promos reduce margin below viable threshold`,
      priority: DecisionPriority.PROFITABILITY,
    });
  }

  if (total < 10 && input.station.surge_multiplier > 1.5) {
    decisions.push({
      module: "profit", action: "flag_unprofitable",
      jobType: "delivery",
      estimatedLoss: MIN_DELIVERY_FEE - total * (minMargin / 100),
      priority: DecisionPriority.PROFITABILITY,
    });
  }

  return decisions;
}
