/**
 * Platform Super Brain — Orchestrator (thin re-export).
 * All logic lives in src/lib/brain/arbitration/*.ts
 */
export { DecisionPriority } from "./arbitration/types";
export type { ArbitrationDecision, ArbitrationInput, ArbitrationResult } from "./arbitration/types";

import type { ArbitrationInput, ArbitrationResult } from "./arbitration/types";
import { DecisionPriority } from "./arbitration/types";
import type { GeoLiveStation, ETAProjection } from "@/lib/radar/eta-projection-engine";
import type { MerchantRuntime, RiderRuntimeState } from "@/lib/mobility/live-context-engine";

import { arbitrateDemand } from "./arbitration/arbitrate-demand";
import { arbitrateETA } from "./arbitration/arbitrate-eta";
import { arbitrateProfit } from "./arbitration/arbitrate-profit";
import { arbitrateMerchantVisibility } from "./arbitration/arbitrate-merchant";
import { arbitrateRiderIncentives } from "./arbitration/arbitrate-rider";
import { arbitratePromises } from "./arbitration/arbitrate-promise";
import { resolveConflicts } from "./arbitration/conflict-resolver";
import { buildSummary } from "./arbitration/build-summary";

export function arbitrate(input: ArbitrationInput): ArbitrationResult {
  const demandDecisions = arbitrateDemand(input);
  const { decisions: etaDecisions, adjustedETAs } = arbitrateETA(input);
  const profitDecisions = arbitrateProfit(input);
  const merchantDecisions = arbitrateMerchantVisibility(input);
  const riderDecisions = arbitrateRiderIncentives(input);
  const promiseDecisions = arbitratePromises(input, adjustedETAs);

  const allDecisions = [
    ...demandDecisions, ...etaDecisions, ...profitDecisions,
    ...merchantDecisions, ...riderDecisions, ...promiseDecisions,
  ];

  const resolved = resolveConflicts(allDecisions);
  const criticalDecisions = resolved.filter(d => d.priority <= DecisionPriority.OPERATIONAL_TRUTH);

  const surgeDecision = resolved.find(d => d.module === "demand" && d.action === "apply_surge");
  const suppressSurge = resolved.find(d => d.module === "demand" && d.action === "suppress_surge");
  let arbitratedSurge = input.station.surge_multiplier;
  if (surgeDecision && surgeDecision.action === "apply_surge" && !suppressSurge) {
    arbitratedSurge = surgeDecision.multiplier;
  } else if (suppressSurge) {
    arbitratedSurge = 1.0;
  }

  const safetyBlock = resolved.some(
    d => d.priority === DecisionPriority.SAFETY &&
      (d.action === "reject_promise" || d.action === "block_promise")
  );

  return {
    decisions: resolved,
    criticalDecisions,
    arbitratedETAs: adjustedETAs,
    arbitratedSurge,
    safetyBlock,
    summary: buildSummary(resolved, adjustedETAs, arbitratedSurge, safetyBlock),
    timestamp: new Date().toISOString(),
  };
}

export function quickArbitrate(
  station: GeoLiveStation,
  etas: ETAProjection,
  riders: RiderRuntimeState[] = [],
  merchants: MerchantRuntime[] = []
): ArbitrationResult {
  return arbitrate({ station, etas, radarState: null, merchants, riders });
}
