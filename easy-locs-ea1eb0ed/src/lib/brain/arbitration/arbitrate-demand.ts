/**
 * Demand Arbitration — surge pricing and supply/demand balancing.
 */
import type { ArbitrationInput, ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function arbitrateDemand(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const { station, riders } = input;

  const availableRiders = riders.filter(r => r.is_online && r.is_available).length;
  const demandLevel = station.demand_level;
  const supplyRatio = availableRiders > 0 ? demandLevel / availableRiders : demandLevel;

  if (supplyRatio > 3 && availableRiders < 5) {
    const multiplier = Math.min(2.0, 1.0 + (supplyRatio - 3) * 0.15);
    decisions.push({
      module: "demand", action: "apply_surge", multiplier,
      zoneKey: station.zone_key,
      reason: `Supply ratio ${supplyRatio.toFixed(1)} with only ${availableRiders} riders`,
      priority: DecisionPriority.OPERATIONAL_TRUTH,
    });
  }

  if (demandLevel > 85 && availableRiders < 3) {
    decisions.push({
      module: "demand", action: "alert_ops",
      zoneKey: station.zone_key,
      message: `Critical supply shortage: ${availableRiders} riders for demand level ${demandLevel}`,
      priority: DecisionPriority.SAFETY,
    });
  }

  if (supplyRatio < 1.5 && station.surge_multiplier > 1.1) {
    decisions.push({
      module: "demand", action: "suppress_surge",
      zoneKey: station.zone_key,
      reason: `Demand normalized (ratio ${supplyRatio.toFixed(1)}), surge no longer justified`,
      priority: DecisionPriority.CUSTOMER_PROMISE,
    });
  }

  return decisions;
}
