/**
 * DINO V10 — Market Domination Engine
 * Predict → Decide → Execute → Learn → Dominate
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// =============================
// TYPES
// =============================

export interface MarketSignal {
  country: string;
  city: string;
  category: string;
  searchVolume: number;
  conversionRate: number;
  supply: number;
  growthRate: number;
  timestamp: number;
}

export interface Prediction {
  category: string;
  city: string;
  score: number;
  trend: "rising" | "stable" | "declining";
  confidence: number;
  recommendedAction: string;
}

export interface SurgeRule {
  category: string;
  multiplier: number;
  reason: string;
}

export interface UserProfile {
  id: string;
  country: string;
  city: string;
  preferences: string[];
  lastActions: string[];
}

// =============================
// 1) MARKET PREDICTION ENGINE
// =============================

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function predictMarketTrends(signals: MarketSignal[]): Prediction[] {
  const grouped: Record<string, MarketSignal[]> = {};
  for (const s of signals) {
    const key = `${s.city}:${s.category}`;
    (grouped[key] ??= []).push(s);
  }

  const predictions: Prediction[] = [];
  for (const key in grouped) {
    const data = grouped[key];
    const latest = data[data.length - 1];
    const avgSearch = avg(data.map(d => d.searchVolume));
    const avgGrowth = avg(data.map(d => d.growthRate));
    const demandScore = avgSearch * 100;
    const supplyPenalty = latest.supply * 5;
    const score = Math.max(0, Math.min(100, demandScore + avgGrowth * 50 - supplyPenalty));
    const trend: Prediction["trend"] =
      avgGrowth > 0.2 ? "rising" : avgGrowth < -0.2 ? "declining" : "stable";

    predictions.push({
      category: latest.category,
      city: latest.city,
      score,
      trend,
      confidence: Math.min(1, data.length / 10),
      recommendedAction: score > 70 ? "expand aggressively" : score > 50 ? "boost visibility" : "monitor",
    });
  }
  return predictions.sort((a, b) => b.score - a.score);
}

// =============================
// 2) SURGE / AUTO PRICING
// =============================

export function computeSurgeRules(predictions: Prediction[]): SurgeRule[] {
  return predictions
    .filter(p => p.score > 60)
    .map(p => ({
      category: p.category,
      multiplier: p.score > 75 && p.trend === "rising" ? 1.5 : 1.2,
      reason: p.score > 75 ? "high demand surge" : "moderate demand",
    }));
}

// =============================
// 3) AUTO EXPANSION
// =============================

export function generateExpansionActions(predictions: Prediction[]) {
  return predictions
    .filter(p => p.score > 70)
    .map(p => ({
      type: "expand_market" as const,
      city: p.city,
      category: p.category,
      action: `Recruit providers in ${p.city} for ${p.category}`,
    }));
}

// =============================
// 4) HYPER PERSONALIZATION
// =============================

export function personalizeFeed(user: UserProfile, predictions: Prediction[]) {
  return predictions
    .filter(p => user.preferences.includes(p.category) || user.lastActions.includes(p.category))
    .slice(0, 6)
    .map(p => ({ title: `${p.category} in ${p.city}`, action: p.recommendedAction, score: p.score }));
}

// =============================
// 5) AUTO BUSINESS CREATOR
// =============================

export function detectBusinessOpportunities(predictions: Prediction[]) {
  return predictions
    .filter(p => p.score > 80)
    .map(p => ({
      idea: `Launch ${p.category} in ${p.city}`,
      potential: p.score,
      execution: "auto-onboard + marketing push",
    }));
}

// =============================
// 6) GLOBAL DOMINATION LOOP
// =============================

export async function runV10Domination() {
  const signals = await fetchMarketSignals();
  const predictions = predictMarketTrends(signals);
  const surgeRules = computeSurgeRules(predictions);
  const expansion = generateExpansionActions(predictions);
  const opportunities = detectBusinessOpportunities(predictions);

  await applySurgeRules(surgeRules);
  await executeExpansion(expansion);
  await triggerOpportunities(opportunities);

  // Apply smart boosts via visibility engine
  const { applyBoostOverride, computeSmartBoost } = await import("./visibilityEngine");
  for (const p of predictions.filter(p => p.score > 60).slice(0, MAX_BOOSTS_PER_CYCLE)) {
    await applyBoostOverride({
      entityId: p.category,
      multiplier: computeSmartBoost(p.score, p.trend),
      durationMs: 2 * 3600 * 1000,
      reason: `v10_surge_${p.trend}`,
    });
  }

  return { predictions, surgeRules, expansion, opportunities };
}

const MAX_BOOSTS_PER_CYCLE = 20;

// =============================
// 7) REAL CONNECTORS
// =============================

async function fetchMarketSignals(): Promise<MarketSignal[]> {
  const { data } = await supabase
    .from("dino_market_balance")
    .select("category_name, location_key, listing_count, demand_signal, avg_quality, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return [];
  return data.map(row => ({
    country: "",
    city: row.location_key ?? "unknown",
    category: row.category_name,
    searchVolume: (row.demand_signal ?? 0) / 100,
    conversionRate: (row.avg_quality ?? 0) / 100,
    supply: row.listing_count ?? 0,
    growthRate: 0,
    timestamp: new Date(row.created_at).getTime(),
  }));
}

async function applySurgeRules(rules: SurgeRule[]) {
  if (!rules.length) return;
  await supabase.from("dino_learning_events").insert(
    rules.map(r => ({
      event_type: "surge_applied",
      entity_id: r.category,
      entity_type: "category",
      metric: "surge_multiplier",
      metadata_json: { multiplier: r.multiplier, reason: r.reason } as unknown as Json,
      new_value: r.multiplier,
      previous_value: 1,
    }))
  );
}

async function executeExpansion(actions: { city: string; category: string }[]) {
  if (!actions.length) return;
  await supabase.from("dino_expansion_opportunities").insert(
    actions.map(a => ({
      city: a.city,
      category: a.category,
      country: "",
      gap_score: 80,
      priority: "high",
      status: "identified",
    }))
  );
}

async function triggerOpportunities(opps: { idea: string; potential: number }[]) {
  if (!opps.length) return;
  await supabase.from("dino_learning_events").insert(
    opps.map(o => ({
      event_type: "opportunity_detected",
      entity_id: o.idea,
      entity_type: "opportunity",
      metric: "potential_score",
      metadata_json: { idea: o.idea } as unknown as Json,
      new_value: o.potential,
      previous_value: 0,
    }))
  );
}
