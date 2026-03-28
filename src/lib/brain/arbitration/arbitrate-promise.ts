/**
 * Promise Control Engine — reject/degrade promises based on safety and capacity.
 */
import type { ETAProjection } from "@/lib/radar/eta-projection-engine";
import type { ArbitrationInput, ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function arbitratePromises(input: ArbitrationInput, adjustedETAs: ETAProjection): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const { station } = input;

  if (station.flood_risk_level === "high" || station.flood_risk_level === "critical") {
    decisions.push({
      module: "promise", action: "reject_promise",
      promiseType: "delivery",
      reason: `Flood risk level: ${station.flood_risk_level}`,
      priority: DecisionPriority.SAFETY,
    });
  }

  if (station.weather_type === "storm") {
    decisions.push({
      module: "promise", action: "degrade_promise",
      promiseType: "delivery_speed",
      degradedValue: "Deliveries may be delayed due to weather conditions",
      reason: "Active storm in zone",
      priority: DecisionPriority.SAFETY,
    });
  }

  if (station.rider_supply === 0) {
    decisions.push({
      module: "promise", action: "reject_promise",
      promiseType: "instant_delivery",
      reason: "No riders available in zone",
      priority: DecisionPriority.OPERATIONAL_TRUTH,
    });
  }

  for (const cat of ["food", "grocery", "parcel"] as const) {
    if (adjustedETAs[cat] != null && adjustedETAs[cat]! > 60) {
      decisions.push({
        module: "promise", action: "degrade_promise",
        promiseType: `${cat}_speed`,
        degradedValue: `${cat} delivery may take longer than usual`,
        reason: `Adjusted ETA ${adjustedETAs[cat]}min exceeds 60min threshold`,
        priority: DecisionPriority.CUSTOMER_PROMISE,
      });
    }
  }

  return decisions;
}
