/**
 * DINO V17 — Global Engine
 * Multi-country expansion + currency adaptation + market launch.
 * Uses existing: dino_market_balance, dino_expansion_opportunities,
 * dino_notifications, dino_learning_events, driver_profiles.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { detectInactiveDrivers } from "./driverEngine";

// =============================
// TYPES
// =============================

export interface ExpansionSignal {
  city: string;
  country: string;
  category: string;
  demandScore: number;
  supplyCount: number;
  gapScore: number;
}

/** Country → default currency mapping */
const COUNTRY_CURRENCY: Record<string, string> = {
  AE: "AED", US: "USD", FR: "EUR", GB: "GBP",
  IN: "INR", TH: "THB", SA: "SAR", MA: "MAD",
};

/** Purchasing power parity multipliers (vs AED baseline) */
const PPP_MULTIPLIERS: Record<string, number> = {
  AE: 1, US: 1.1, FR: 1.15, GB: 1.2,
  IN: 0.5, TH: 0.6, SA: 0.95, MA: 0.55,
};

// =============================
// 1) DETECT NEW MARKET OPPORTUNITIES
// =============================

export async function detectNewMarkets(): Promise<ExpansionSignal[]> {
  const { data } = await supabase
    .from("dino_market_balance")
    .select("location_key, category_name, demand_signal, listing_count")
    .order("demand_signal", { ascending: false })
    .limit(100);

  if (!data) return [];

  return data
    .filter(d => (d.demand_signal ?? 0) > 60 && (d.listing_count ?? 0) < 5)
    .map(d => ({
      city: d.location_key ?? "unknown",
      country: "AE", // default, overridden by location logic
      category: d.category_name,
      demandScore: d.demand_signal ?? 0,
      supplyCount: d.listing_count ?? 0,
      gapScore: Math.round((d.demand_signal ?? 0) - (d.listing_count ?? 0) * 10),
    }))
    .sort((a, b) => b.gapScore - a.gapScore);
}

// =============================
// 2) LAUNCH MARKET
// =============================

export async function launchMarket(signal: ExpansionSignal): Promise<void> {
  // Record in expansion opportunities
  await supabase.from("dino_expansion_opportunities").insert({
    city: signal.city,
    category: signal.category,
    country: signal.country,
    gap_score: signal.gapScore,
    priority: signal.gapScore > 70 ? "critical" : "high",
    status: "launched",
  });

  await supabase.from("dino_learning_events").insert([{
    event_type: "market_launched",
    entity_id: `${signal.city}:${signal.category}`,
    entity_type: "market",
    metric: "gap_score",
    metadata_json: signal as unknown as Json,
    new_value: signal.gapScore,
    previous_value: 0,
  }]);
}

// =============================
// 3) MULTI-CURRENCY SUPPORT
// =============================

export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode] ?? "USD";
}

/**
 * Adapts a base price (AED) to a target country using PPP multipliers.
 * For live rates, an exchange rate API should be used.
 */
export function adaptPriceForMarket(baseAmountAED: number, targetCountry: string): {
  amount: number;
  currency: string;
  multiplier: number;
} {
  const multiplier = PPP_MULTIPLIERS[targetCountry] ?? 1;
  const currency = getCurrencyForCountry(targetCountry);
  return {
    amount: Math.round(baseAmountAED * multiplier),
    currency,
    multiplier,
  };
}

// =============================
// 4) ACTIVATE DRIVERS FOR MARKET
// =============================

export async function activateDriversForMarket(city: string): Promise<number> {
  const inactiveIds = await detectInactiveDrivers(city);
  const batch = inactiveIds.slice(0, 30);

  if (!batch.length) return 0;

  const notifications = batch.map(uid => ({
    actor_type: "driver" as const,
    actor_id: uid,
    channel: "push" as const,
    template_key: "driver_activation",
    payload_json: {
      message: `🚀 High demand in ${city} — go online now to earn more!`,
      city,
    } as Json,
    status: "pending" as const,
  }));

  await supabase.from("dino_notifications").insert(notifications);
  return batch.length;
}

// =============================
// 5) FULL GLOBAL EXPANSION LOOP
// =============================

const MAX_LAUNCHES_PER_CYCLE = 3;

export async function runGlobalExpansion(): Promise<{
  signals: ExpansionSignal[];
  launched: number;
  driversActivated: number;
}> {
  const signals = await detectNewMarkets();
  let launched = 0;
  let driversActivated = 0;

  for (const signal of signals.slice(0, MAX_LAUNCHES_PER_CYCLE)) {
    await launchMarket(signal);
    launched++;

    const activated = await activateDriversForMarket(signal.city);
    driversActivated += activated;
  }

  if (launched > 0) {
    await supabase.from("dino_learning_events").insert([{
      event_type: "v17_global_cycle",
      entity_id: "system",
      entity_type: "expansion",
      metric: "markets_launched",
      metadata_json: { launched, driversActivated, totalSignals: signals.length } as unknown as Json,
      new_value: launched,
      previous_value: 0,
    }]);
  }

  return { signals, launched, driversActivated };
}
