/**
 * Dynamic AI-assisted delivery pricing engine for Easy-Locs.
 * Country-aware with AI optimization layer that adjusts within safe limits.
 * Pricing rules remain source of truth — AI only fine-tunes.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────
export interface DeliveryPricingInput {
  countryCode: string;
  city?: string;
  distanceKm: number;
  isPeak?: boolean;
  isNight?: boolean;
  isPremiumZone?: boolean;
  vehicleType?: "bike" | "car" | "van" | "truck";
  weightKg?: number;
  volumeL?: number;
}

export interface AISignals {
  liveDemand?: number;
  driverAvailability?: number;
  avgEtaMinutes?: number;
  acceptanceRate?: number;
  conversionRate?: number;
}

export interface DeliveryPriceResult {
  baseFee: number;
  distanceCharge: number;
  multiplierTotal: number;
  vehicleFactor: number;
  weightFactor: number;
  aiAdjustment: number;
  rawFee: number;
  finalFee: number;
  currency: string;
  breakdown: Record<string, number>;
  aiApplied: boolean;
  aiReason?: string;
}

// ── Vehicle & Weight Factors ──────────────────────────────
const VEHICLE_FACTORS: Record<string, number> = {
  bike: 0.8,
  car: 1.0,
  van: 1.4,
  truck: 2.0,
};

function computeWeightFactor(weightKg?: number, volumeL?: number): number {
  let f = 1.0;
  if (weightKg) {
    if (weightKg > 50) f = 1.8;
    else if (weightKg > 20) f = 1.4;
    else if (weightKg > 10) f = 1.15;
  }
  if (volumeL && volumeL > 100) f = Math.max(f, 1.3);
  return f;
}

// ── AI Optimization Layer ─────────────────────────────────
// AI adjusts price within ±20% of rule-based price.
const AI_MAX_ADJUSTMENT = 0.20; // 20% cap

function computeAIAdjustment(rawFee: number, signals: AISignals): { factor: number; reason: string } {
  if (!signals.liveDemand && !signals.driverAvailability) {
    return { factor: 1.0, reason: "no_signals" };
  }

  let adjustment = 0;
  const reasons: string[] = [];

  // Demand/supply ratio
  const demand = signals.liveDemand ?? 1;
  const supply = signals.driverAvailability ?? 1;
  const ratio = demand / Math.max(supply, 1);

  if (ratio > 2.0) {
    adjustment += 0.15;
    reasons.push("high_demand");
  } else if (ratio > 1.5) {
    adjustment += 0.08;
    reasons.push("moderate_demand");
  } else if (ratio < 0.5) {
    adjustment -= 0.08;
    reasons.push("low_demand_discount");
  }

  // ETA pressure — long ETAs mean fewer drivers, increase slightly
  if (signals.avgEtaMinutes && signals.avgEtaMinutes > 30) {
    adjustment += 0.05;
    reasons.push("long_eta");
  }

  // Low acceptance rate — incentivize drivers
  if (signals.acceptanceRate != null && signals.acceptanceRate < 0.4) {
    adjustment += 0.10;
    reasons.push("low_acceptance");
  }

  // Conversion protection — if high conversion, don't push price too high
  if (signals.conversionRate != null && signals.conversionRate > 0.7 && adjustment > 0.05) {
    adjustment = Math.min(adjustment, 0.05);
    reasons.push("conversion_protected");
  }

  // Margin protection — never discount below cost floor
  if (adjustment < 0) {
    adjustment = Math.max(adjustment, -0.10);
    reasons.push("margin_floor");
  }

  // Cap at ±20%
  const capped = Math.max(-AI_MAX_ADJUSTMENT, Math.min(AI_MAX_ADJUSTMENT, adjustment));

  return {
    factor: 1 + capped,
    reason: reasons.join(",") || "balanced",
  };
}

// ── Main Engine ───────────────────────────────────────────
export async function calculateDynamicDeliveryPrice(
  input: DeliveryPricingInput,
  aiSignals?: AISignals
): Promise<DeliveryPriceResult> {
  // 1. Fetch pricing rule from DB
  let query = (supabase as any)
    .from("delivery_pricing_rules")
    .select("*")
    .eq("country_code", input.countryCode)
    .eq("active", true);

  if (input.city) query = query.eq("city", input.city);
  const { data } = await query.maybeSingle();
  let rule = data;

  // Fallback: country-level rule
  if (!rule && input.city) {
    const { data: fb } = await (supabase as any)
      .from("delivery_pricing_rules")
      .select("*")
      .eq("country_code", input.countryCode)
      .is("city", null)
      .eq("active", true)
      .maybeSingle();
    rule = fb;
  }

  // Hard fallback
  if (!rule) {
    rule = {
      base_fee: 5, per_km_rate: 1.5, min_fee: 3, max_fee: null,
      peak_multiplier: 1.3, night_multiplier: 1.2, premium_zone_multiplier: 1.5,
    };
  }

  // 2. Compute base
  const baseFee = Number(rule.base_fee);
  const distanceCharge = input.distanceKm * Number(rule.per_km_rate);

  // 3. Contextual multipliers
  let multiplierTotal = 1;
  if (input.isPeak) multiplierTotal *= Number(rule.peak_multiplier);
  if (input.isNight) multiplierTotal *= Number(rule.night_multiplier);
  if (input.isPremiumZone) multiplierTotal *= Number(rule.premium_zone_multiplier);

  // 4. Vehicle & weight
  const vehicleFactor = VEHICLE_FACTORS[input.vehicleType ?? "car"] ?? 1.0;
  const weightFactor = computeWeightFactor(input.weightKg, input.volumeL);

  // 5. Raw fee (rule-based)
  let rawFee = (baseFee + distanceCharge) * multiplierTotal * vehicleFactor * weightFactor;

  // 6. AI adjustment
  let aiAdjustment = 1.0;
  let aiReason = "none";
  let aiApplied = false;

  if (aiSignals) {
    const ai = computeAIAdjustment(rawFee, aiSignals);
    aiAdjustment = ai.factor;
    aiReason = ai.reason;
    aiApplied = ai.factor !== 1.0;
  }

  let finalFee = rawFee * aiAdjustment;

  // 7. Enforce min/max
  finalFee = Math.max(finalFee, Number(rule.min_fee));
  if (rule.max_fee != null) finalFee = Math.min(finalFee, Number(rule.max_fee));
  finalFee = Number(finalFee.toFixed(2));
  rawFee = Number(rawFee.toFixed(2));

  return {
    baseFee,
    distanceCharge: Number(distanceCharge.toFixed(2)),
    multiplierTotal,
    vehicleFactor,
    weightFactor,
    aiAdjustment,
    rawFee,
    finalFee,
    currency: "AED",
    breakdown: {
      base: baseFee,
      distance: Number(distanceCharge.toFixed(2)),
      multipliers: multiplierTotal,
      vehicle: vehicleFactor,
      weight: weightFactor,
      ai: aiAdjustment,
    },
    aiApplied,
    aiReason,
  };
}
