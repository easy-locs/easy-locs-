/**
 * Platform Super Brain — Execution Arbitration Layer
 * 
 * PURPOSE: Single decision authority that resolves conflicts between
 * customer, rider, merchant, and platform interests.
 * 
 * RULES:
 * - Reads ONLY from canonical sources (geo_live_station, mobility_jobs, etc.)
 * - Creates NO duplicate tables, state, or logic
 * - Emits ONLY decisions/instructions consumed by existing engines
 * - Priority: Safety > Operational Truth > Customer Promise > Profitability > Growth
 * 
 * CANONICAL INPUTS:
 * - GeoLiveStation (from eta-projection-engine)
 * - RadarBrainState (from radar-brain-orchestrator)
 * - PricingContext (from dynamic-pricing-engine)
 * - GeoLiveContext (from live-context-engine)
 * - MerchantRuntime / RiderRuntimeState (from live-context-engine)
 * 
 * This layer ARBITRATES. It does not replace existing engines.
 */

import type { GeoLiveStation, ETAProjection } from "@/lib/radar/eta-projection-engine";
import type { PricingContext, PricingResult } from "@/lib/radar/dynamic-pricing-engine";
import type { RadarBrainState, RadarDecision } from "@/lib/radar/radar-brain-orchestrator";
import type { GeoLiveContext, MerchantRuntime, RiderRuntimeState } from "@/lib/mobility/live-context-engine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRIORITY MODEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export enum DecisionPriority {
  SAFETY = 1,
  OPERATIONAL_TRUTH = 2,
  CUSTOMER_PROMISE = 3,
  PROFITABILITY = 4,
  GROWTH = 5,
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARBITRATION DECISION TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARBITRATION INPUT (canonical snapshot)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ArbitrationInput {
  station: GeoLiveStation;
  etas: ETAProjection;
  radarState: RadarBrainState | null;
  merchants: MerchantRuntime[];
  riders: RiderRuntimeState[];
  pricingContext?: PricingContext;
  pricingResult?: PricingResult;
  /** Active promos in this zone */
  activePromoCount?: number;
  /** Platform minimum margin percent */
  minMarginPercent?: number;
}

export interface ArbitrationResult {
  decisions: ArbitrationDecision[];
  /** Filtered decisions by highest priority first */
  criticalDecisions: ArbitrationDecision[];
  /** Final arbitrated ETA (after trust adjustments) */
  arbitratedETAs: ETAProjection;
  /** Final arbitrated surge multiplier */
  arbitratedSurge: number;
  /** Whether any safety block is active */
  safetyBlock: boolean;
  /** Human-readable summary */
  summary: string;
  timestamp: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE 1: DEMAND ARBITRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function arbitrateDemand(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const { station, riders } = input;

  const availableRiders = riders.filter(r => r.is_online && r.is_available).length;
  const demandLevel = station.demand_level;
  const supplyRatio = availableRiders > 0 ? demandLevel / availableRiders : demandLevel;

  // High demand, low supply → surge
  if (supplyRatio > 3 && availableRiders < 5) {
    const multiplier = Math.min(2.0, 1.0 + (supplyRatio - 3) * 0.15);
    decisions.push({
      module: "demand",
      action: "apply_surge",
      multiplier,
      zoneKey: station.zone_key,
      reason: `Supply ratio ${supplyRatio.toFixed(1)} with only ${availableRiders} riders`,
      priority: DecisionPriority.OPERATIONAL_TRUTH,
    });
  }

  // Extreme demand → alert ops
  if (demandLevel > 85 && availableRiders < 3) {
    decisions.push({
      module: "demand",
      action: "alert_ops",
      zoneKey: station.zone_key,
      message: `Critical supply shortage: ${availableRiders} riders for demand level ${demandLevel}`,
      priority: DecisionPriority.SAFETY,
    });
  }

  // Low demand zone with active surge → suppress
  if (supplyRatio < 1.5 && station.surge_multiplier > 1.1) {
    decisions.push({
      module: "demand",
      action: "suppress_surge",
      zoneKey: station.zone_key,
      reason: `Demand normalized (ratio ${supplyRatio.toFixed(1)}), surge no longer justified`,
      priority: DecisionPriority.CUSTOMER_PROMISE,
    });
  }

  return decisions;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE 2: ETA TRUST ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function arbitrateETA(input: ArbitrationInput): { decisions: ArbitrationDecision[]; adjustedETAs: ETAProjection } {
  const decisions: ArbitrationDecision[] = [];
  const { station, etas } = input;

  const adjustedETAs: ETAProjection = { ...etas };

  // Safety buffer under severe weather
  if (station.weather_type === "storm" || station.weather_intensity > 0.8) {
    const buffer = Math.round(station.weather_intensity * 8);
    for (const cat of ["food", "grocery", "taxi", "parcel"] as const) {
      if (adjustedETAs[cat] != null) {
        adjustedETAs[cat] = adjustedETAs[cat]! + buffer;
        decisions.push({
          module: "eta",
          action: "add_buffer",
          category: cat,
          bufferMinutes: buffer,
          reason: `Severe weather (${station.weather_type}, intensity ${station.weather_intensity})`,
          priority: DecisionPriority.SAFETY,
        });
      }
    }
  }

  // Traffic-based buffer under heavy/severe
  if (station.traffic_level === "heavy" || station.traffic_level === "severe") {
    const trafficBuffer = station.traffic_level === "severe" ? 10 : 5;
    for (const cat of ["food", "grocery", "parcel"] as const) {
      if (adjustedETAs[cat] != null) {
        adjustedETAs[cat] = adjustedETAs[cat]! + trafficBuffer;
      }
    }
    if (adjustedETAs.taxi != null) {
      adjustedETAs.taxi = adjustedETAs.taxi! + Math.round(trafficBuffer * 0.6);
    }
  }

  // Block unrealistic promises: no food delivery < 8 min
  const ETA_FLOORS: Record<string, number> = { food: 8, grocery: 12, taxi: 3, parcel: 10 };
  for (const cat of ["food", "grocery", "taxi", "parcel"] as const) {
    const floor = ETA_FLOORS[cat];
    if (adjustedETAs[cat] != null && adjustedETAs[cat]! < floor) {
      decisions.push({
        module: "eta",
        action: "block_promise",
        category: cat,
        reason: `ETA ${adjustedETAs[cat]}min below realistic floor ${floor}min`,
        priority: DecisionPriority.OPERATIONAL_TRUTH,
      });
      adjustedETAs[cat] = floor;
    }
  }

  // No rider supply → block all ETA promises
  if (station.rider_supply === 0) {
    for (const cat of ["food", "grocery", "parcel"] as const) {
      if (adjustedETAs[cat] != null) {
        decisions.push({
          module: "eta",
          action: "block_promise",
          category: cat,
          reason: "Zero riders available in zone",
          priority: DecisionPriority.OPERATIONAL_TRUTH,
        });
        adjustedETAs[cat] = null;
      }
    }
  }

  return { decisions, adjustedETAs };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE 3: PROFIT PROTECTION ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function arbitrateProfit(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const minMargin = input.minMarginPercent ?? 8;

  if (input.pricingResult) {
    const total = input.pricingResult.totalEstimate;
    const platformCut = total * (minMargin / 100);

    // Fee floor: ensure minimum viable delivery fee
    const MIN_DELIVERY_FEE = 5; // AED
    if (input.pricingResult.deliveryFee < MIN_DELIVERY_FEE) {
      decisions.push({
        module: "profit",
        action: "enforce_floor",
        minFee: MIN_DELIVERY_FEE,
        currency: input.pricingResult.currency,
        reason: `Delivery fee ${input.pricingResult.deliveryFee} below minimum ${MIN_DELIVERY_FEE}`,
        priority: DecisionPriority.PROFITABILITY,
      });
    }

    // Suppress promos in zones with bad conditions (high surge + low supply)
    if (input.station.surge_multiplier > 1.3 && input.activePromoCount && input.activePromoCount > 0) {
      decisions.push({
        module: "profit",
        action: "suppress_promo",
        reason: `Surge ${input.station.surge_multiplier.toFixed(2)}x active — promos reduce margin below viable threshold`,
        priority: DecisionPriority.PROFITABILITY,
      });
    }

    // Flag unprofitable short-distance deliveries under surge
    if (total < 10 && input.station.surge_multiplier > 1.5) {
      decisions.push({
        module: "profit",
        action: "flag_unprofitable",
        jobType: "delivery",
        estimatedLoss: MIN_DELIVERY_FEE - total * (minMargin / 100),
        priority: DecisionPriority.PROFITABILITY,
      });
    }
  }

  return decisions;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE 4: MERCHANT VISIBILITY ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function arbitrateMerchantVisibility(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const { merchants } = input;

  for (const m of merchants) {
    // Not accepting orders → lower visibility
    if (!m.accepting_orders && m.is_open_now) {
      decisions.push({
        module: "merchant",
        action: "lower_visibility",
        merchantId: m.merchant_id,
        newScore: -20,
        reason: "Open but not accepting orders",
        priority: DecisionPriority.CUSTOMER_PROMISE,
      });
    }

    // Extremely long prep time → penalty
    if (m.prep_time_minutes > 45) {
      decisions.push({
        module: "merchant",
        action: "lower_visibility",
        merchantId: m.merchant_id,
        newScore: -15,
        reason: `Prep time ${m.prep_time_minutes}min exceeds 45min threshold`,
        priority: DecisionPriority.CUSTOMER_PROMISE,
      });
    }

    // Queue overload → temporary visibility reduction
    if (m.queue_load > 0.9 && m.active_orders_count > 10) {
      decisions.push({
        module: "merchant",
        action: "lower_visibility",
        merchantId: m.merchant_id,
        newScore: -10,
        reason: `Queue overloaded (${(m.queue_load * 100).toFixed(0)}% load, ${m.active_orders_count} orders)`,
        priority: DecisionPriority.OPERATIONAL_TRUTH,
      });
    }

    // Low delivery capacity → hide from delivery discovery
    if (m.delivery_capacity_score < 0.2 && m.active_delivery_jobs_count > 3) {
      decisions.push({
        module: "merchant",
        action: "hide_merchant",
        merchantId: m.merchant_id,
        reason: `Delivery capacity exhausted (score ${m.delivery_capacity_score.toFixed(2)})`,
        priority: DecisionPriority.OPERATIONAL_TRUTH,
      });
    }

    // Fast + reliable → boost
    if (m.prep_time_minutes <= 10 && m.queue_load < 0.4 && m.delivery_capacity_score > 0.8) {
      decisions.push({
        module: "merchant",
        action: "boost_visibility",
        merchantId: m.merchant_id,
        boostScore: 15,
        reason: "Fast prep, low queue, high capacity",
        priority: DecisionPriority.GROWTH,
      });
    }
  }

  return decisions;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE 5: RIDER INCENTIVE ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function arbitrateRiderIncentives(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const { station, riders } = input;

  const availableRiders = riders.filter(r => r.is_online && r.is_available);
  const idleRiders = availableRiders.filter(r => !r.active_job_id);

  // High demand, few riders → zone incentive
  if (station.demand_level > 60 && availableRiders.length < 5) {
    const bonus = Math.round(5 + (station.demand_level - 60) * 0.2);
    decisions.push({
      module: "rider",
      action: "incentivize_zone",
      zoneKey: station.zone_key,
      bonusAmount: bonus,
      currency: "AED",
      priority: DecisionPriority.OPERATIONAL_TRUTH,
    });
  }

  // Many idle riders → suggest repositioning to nearby high-demand zones
  if (idleRiders.length > 8 && station.demand_level < 20) {
    decisions.push({
      module: "rider",
      action: "reposition_idle",
      riderIds: idleRiders.slice(0, 5).map(r => r.rider_user_id),
      targetZone: station.zone_key, // Will be replaced by adjacent high-demand zone in orchestrator
      priority: DecisionPriority.GROWTH,
    });
  }

  // High-performing riders → priority boost during surge
  if (station.surge_multiplier > 1.2) {
    for (const rider of availableRiders) {
      if ((rider.acceptance_rate ?? 0) > 0.85) {
        decisions.push({
          module: "rider",
          action: "priority_boost",
          riderId: rider.rider_user_id,
          boostScore: 10,
          priority: DecisionPriority.PROFITABILITY,
        });
      }
    }
  }

  return decisions;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE 6: PROMISE CONTROL ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function arbitratePromises(input: ArbitrationInput, adjustedETAs: ETAProjection): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];
  const { station } = input;

  // Flood risk → reject all delivery promises
  if (station.flood_risk_level === "high" || station.flood_risk_level === "critical") {
    decisions.push({
      module: "promise",
      action: "reject_promise",
      promiseType: "delivery",
      reason: `Flood risk level: ${station.flood_risk_level}`,
      priority: DecisionPriority.SAFETY,
    });
  }

  // Storm conditions → degrade delivery to "delayed"
  if (station.weather_type === "storm") {
    decisions.push({
      module: "promise",
      action: "degrade_promise",
      promiseType: "delivery_speed",
      degradedValue: "Deliveries may be delayed due to weather conditions",
      reason: "Active storm in zone",
      priority: DecisionPriority.SAFETY,
    });
  }

  // No riders available → honest messaging
  if (station.rider_supply === 0) {
    decisions.push({
      module: "promise",
      action: "reject_promise",
      promiseType: "instant_delivery",
      reason: "No riders available in zone",
      priority: DecisionPriority.OPERATIONAL_TRUTH,
    });
  }

  // Extreme ETA → degrade from "fast" to "standard"
  for (const cat of ["food", "grocery", "parcel"] as const) {
    if (adjustedETAs[cat] != null && adjustedETAs[cat]! > 60) {
      decisions.push({
        module: "promise",
        action: "degrade_promise",
        promiseType: `${cat}_speed`,
        degradedValue: `${cat} delivery may take longer than usual`,
        reason: `Adjusted ETA ${adjustedETAs[cat]}min exceeds 60min threshold`,
        priority: DecisionPriority.CUSTOMER_PROMISE,
      });
    }
  }

  return decisions;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MASTER ARBITRATION — SINGLE ENTRY POINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Run the full platform arbitration.
 * Combines all 6 modules, resolves conflicts by priority, outputs final decisions.
 */
export function arbitrate(input: ArbitrationInput): ArbitrationResult {
  // Run all modules
  const demandDecisions = arbitrateDemand(input);
  const { decisions: etaDecisions, adjustedETAs } = arbitrateETA(input);
  const profitDecisions = arbitrateProfit(input);
  const merchantDecisions = arbitrateMerchantVisibility(input);
  const riderDecisions = arbitrateRiderIncentives(input);
  const promiseDecisions = arbitratePromises(input, adjustedETAs);

  // Collect all decisions
  const allDecisions: ArbitrationDecision[] = [
    ...demandDecisions,
    ...etaDecisions,
    ...profitDecisions,
    ...merchantDecisions,
    ...riderDecisions,
    ...promiseDecisions,
  ];

  // Resolve conflicts by priority (lower number = higher priority)
  const resolved = resolveConflicts(allDecisions);

  // Extract critical (Safety + Operational Truth)
  const criticalDecisions = resolved.filter(
    d => d.priority <= DecisionPriority.OPERATIONAL_TRUTH
  );

  // Compute final arbitrated surge
  const surgeDecision = resolved.find(d => d.module === "demand" && d.action === "apply_surge");
  const suppressSurge = resolved.find(d => d.module === "demand" && d.action === "suppress_surge");
  let arbitratedSurge = input.station.surge_multiplier;
  if (surgeDecision && surgeDecision.action === "apply_surge" && !suppressSurge) {
    arbitratedSurge = surgeDecision.multiplier;
  } else if (suppressSurge) {
    arbitratedSurge = 1.0;
  }

  // Safety block check
  const safetyBlock = resolved.some(
    d => d.priority === DecisionPriority.SAFETY &&
      (d.action === "reject_promise" || d.action === "block_promise")
  );

  // Summary
  const summary = buildSummary(resolved, adjustedETAs, arbitratedSurge, safetyBlock);

  return {
    decisions: resolved,
    criticalDecisions,
    arbitratedETAs: adjustedETAs,
    arbitratedSurge,
    safetyBlock,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFLICT RESOLUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function resolveConflicts(decisions: ArbitrationDecision[]): ArbitrationDecision[] {
  // Sort by priority (Safety first)
  const sorted = [...decisions].sort((a, b) => a.priority - b.priority);

  // Remove lower-priority decisions that conflict with higher-priority ones
  const resolved: ArbitrationDecision[] = [];
  const blockedModuleActions = new Set<string>();

  for (const d of sorted) {
    const key = `${d.module}:${d.action}`;

    // Safety decisions block growth decisions on same module
    if (d.priority === DecisionPriority.SAFETY) {
      // Block any growth-level surge if safety says block
      if (d.action === "reject_promise" || d.action === "block_promise") {
        blockedModuleActions.add(`demand:apply_surge`);
        blockedModuleActions.add(`rider:incentivize_zone`);
      }
    }

    // Skip if blocked by higher priority
    if (blockedModuleActions.has(key)) continue;

    // Deduplicate same action on same entity
    const existing = resolved.find(r =>
      r.module === d.module && r.action === d.action &&
      (r as any).zoneKey === (d as any).zoneKey &&
      (r as any).merchantId === (d as any).merchantId &&
      (r as any).category === (d as any).category
    );
    if (existing) continue;

    resolved.push(d);
  }

  return resolved;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUMMARY BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildSummary(
  decisions: ArbitrationDecision[],
  etas: ETAProjection,
  surge: number,
  safetyBlock: boolean
): string {
  const parts: string[] = [];

  if (safetyBlock) parts.push("⚠️ SAFETY BLOCK ACTIVE");
  if (surge > 1.05) parts.push(`Surge: ${surge.toFixed(2)}x`);

  const etaParts = (["food", "grocery", "taxi", "parcel"] as const)
    .filter(c => etas[c] != null)
    .map(c => `${c}: ${etas[c]}min`);
  if (etaParts.length) parts.push(`ETAs: ${etaParts.join(", ")}`);

  parts.push(`${decisions.length} decisions issued`);

  const critical = decisions.filter(d => d.priority <= DecisionPriority.OPERATIONAL_TRUTH).length;
  if (critical > 0) parts.push(`${critical} critical`);

  return parts.join(" | ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVENIENCE: Arbitrate from station snapshot
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Quick arbitration from a GeoLiveStation + riders list.
 * Use this in UI hooks to get arbitrated ETAs and surge.
 */
export function quickArbitrate(
  station: GeoLiveStation,
  etas: ETAProjection,
  riders: RiderRuntimeState[] = [],
  merchants: MerchantRuntime[] = []
): ArbitrationResult {
  return arbitrate({
    station,
    etas,
    radarState: null,
    merchants,
    riders,
  });
}
