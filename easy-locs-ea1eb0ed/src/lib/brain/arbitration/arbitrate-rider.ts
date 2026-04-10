/**
 * Rider Incentive Engine — zone incentives, repositioning, priority boosts.
 */
import type { ArbitrationInput, ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function arbitrateRiderIncentives(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const { station, riders } = input;

  const availableRiders = riders.filter(r => r.is_online && r.is_available);
  const idleRiders = availableRiders.filter(r => !r.active_job_id);

  if (station.demand_level > 60 && availableRiders.length < 5) {
    const bonus = Math.round(5 + (station.demand_level - 60) * 0.2);
    decisions.push({
      module: "rider", action: "incentivize_zone",
      zoneKey: station.zone_key, bonusAmount: bonus, currency: "AED",
      priority: DecisionPriority.OPERATIONAL_TRUTH,
    });
  }

  if (idleRiders.length > 8 && station.demand_level < 20) {
    decisions.push({
      module: "rider", action: "reposition_idle",
      riderIds: idleRiders.slice(0, 5).map(r => r.rider_user_id),
      targetZone: station.zone_key,
      priority: DecisionPriority.GROWTH,
    });
  }

  if (station.surge_multiplier > 1.2) {
    for (const rider of availableRiders) {
      if ((rider.acceptance_rate ?? 0) > 0.85) {
        decisions.push({
          module: "rider", action: "priority_boost",
          riderId: rider.rider_user_id, boostScore: 10,
          priority: DecisionPriority.PROFITABILITY,
        });
      }
    }
  }

  return decisions;
}
