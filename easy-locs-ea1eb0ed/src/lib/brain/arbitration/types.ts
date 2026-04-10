/**
 * Arbitration types — shared across all arbitration modules.
 */
import type { GeoLiveStation, ETAProjection } from "@/lib/radar/eta-projection-engine";
import type { PricingContext, PricingResult } from "@/lib/radar/dynamic-pricing-engine";
import type { RadarBrainState } from "@/lib/radar/radar-brain-orchestrator";
import type { GeoLiveContext, MerchantRuntime, RiderRuntimeState } from "@/lib/mobility/live-context-engine";

export enum DecisionPriority {
  SAFETY = 1,
  OPERATIONAL_TRUTH = 2,
  CUSTOMER_PROMISE = 3,
  PROFITABILITY = 4,
  GROWTH = 5,
}

export type ArbitrationDecision =
  | { module: "demand"; action: "apply_surge"; multiplier: number; zoneKey: string; reason: string; priority: DecisionPriority }
  | { module: "demand"; action: "suppress_surge"; zoneKey: string; reason: string; priority: DecisionPriority }
  | { module: "demand"; action: "zone_boost"; zoneKey: string; boostFactor: number; priority: DecisionPriority }
  | { module: "demand"; action: "alert_ops"; zoneKey: string; message: string; priority: DecisionPriority }
  | { module: "eta"; action: "adjust_eta"; category: string; adjustedMinutes: number; reason: string; priority: DecisionPriority }
  | { module: "eta"; action: "block_promise"; category: string; reason: string; priority: DecisionPriority }
  | { module: "eta"; action: "add_buffer"; category: string; bufferMinutes: number; reason: string; priority: DecisionPriority }
  | { module: "profit"; action: "enforce_floor"; minFee: number; currency: string; reason: string; priority: DecisionPriority }
  | { module: "profit"; action: "suppress_promo"; promoId?: string; reason: string; priority: DecisionPriority }
  | { module: "profit"; action: "flag_unprofitable"; jobType: string; estimatedLoss: number; priority: DecisionPriority }
  | { module: "merchant"; action: "lower_visibility"; merchantId: string; newScore: number; reason: string; priority: DecisionPriority }
  | { module: "merchant"; action: "boost_visibility"; merchantId: string; boostScore: number; reason: string; priority: DecisionPriority }
  | { module: "merchant"; action: "hide_merchant"; merchantId: string; reason: string; priority: DecisionPriority }
  | { module: "rider"; action: "incentivize_zone"; zoneKey: string; bonusAmount: number; currency: string; priority: DecisionPriority }
  | { module: "rider"; action: "reposition_idle"; riderIds: string[]; targetZone: string; priority: DecisionPriority }
  | { module: "rider"; action: "priority_boost"; riderId: string; boostScore: number; priority: DecisionPriority }
  | { module: "promise"; action: "reject_promise"; promiseType: string; reason: string; priority: DecisionPriority }
  | { module: "promise"; action: "degrade_promise"; promiseType: string; degradedValue: string; reason: string; priority: DecisionPriority };

export interface ArbitrationInput {
  station: GeoLiveStation;
  etas: ETAProjection;
  radarState: RadarBrainState | null;
  merchants: MerchantRuntime[];
  riders: RiderRuntimeState[];
  pricingContext?: PricingContext;
  pricingResult?: PricingResult;
  activePromoCount?: number;
  minMarginPercent?: number;
}

export interface ArbitrationResult {
  decisions: ArbitrationDecision[];
  criticalDecisions: ArbitrationDecision[];
  arbitratedETAs: ETAProjection;
  arbitratedSurge: number;
  safetyBlock: boolean;
  summary: string;
  timestamp: string;
}
