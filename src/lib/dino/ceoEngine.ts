/**
 * DINO V19 — AI CEO Engine
 * Autonomous decision system with budget control, mode gating, and learning.
 * Orchestrates all DINO sub-engines into a single strategic cycle.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DinoMode } from "./types";
import { runGrowthEngine } from "./growthEngine";
import { runGlobalExpansion, type ExpansionSignal } from "./globalEngine";
import { runPartnerEngine, upgradeToPriorityPro } from "./partnerEngine";
import { applyBoostOverride, computeSmartBoost } from "./visibilityEngine";

// =============================
// TYPES
// =============================

export interface CEODecision {
  id: string;
  type: "expand_market" | "boost_pro" | "run_growth" | "boost_category" | "partner_rewards";
  priority: "critical" | "high" | "medium" | "low";
  payload: Record<string, unknown>;
  expectedImpact: number; // 0-100
  estimatedCost: number;
}

export interface CEOResult extends CEODecision {
  success: boolean;
  message?: string;
}

export interface CEOConfig {
  mode: DinoMode;
  maxBudgetPerCycle: number;
  maxActions: number;
}

const DEFAULT_CONFIG: CEOConfig = {
  mode: "full_auto",
  maxBudgetPerCycle: 5000,
  maxActions: 20,
};

// =============================
// 1) COLLECT GLOBAL DATA
// =============================

async function collectCEOData() {
  const [market, pros] = await Promise.all([
    supabase.from("dino_market_balance")
      .select("category_name, location_key, demand_signal, listing_count, avg_quality")
      .order("demand_signal", { ascending: false })
      .limit(100),
    supabase.from("dino_pro_performance")
      .select("pro_id, overall_score, tier, completion_rate, conversion_rate")
      .order("overall_score", { ascending: false })
      .limit(50),
  ]);

  return {
    market: market.data ?? [],
    pros: pros.data ?? [],
  };
}

// =============================
// 2) DECISION GENERATION
// =============================

function generateCEODecisions(data: Awaited<ReturnType<typeof collectCEOData>>): CEODecision[] {
  const decisions: CEODecision[] = [];

  // Market expansion opportunities
  const highDemand = data.market.filter(m => (m.demand_signal ?? 0) > 70 && (m.listing_count ?? 0) < 5);
  for (const m of highDemand.slice(0, 5)) {
    decisions.push({
      id: crypto.randomUUID(),
      type: "expand_market",
      priority: (m.demand_signal ?? 0) > 85 ? "critical" : "high",
      payload: { city: m.location_key, category: m.category_name, demand: m.demand_signal },
      expectedImpact: Math.min(100, (m.demand_signal ?? 0)),
      estimatedCost: 500,
    });
  }

  // Boost underperforming pros with potential
  const boostablePros = data.pros.filter(p => p.overall_score >= 40 && p.overall_score < 65 && p.tier === "standard");
  for (const p of boostablePros.slice(0, 5)) {
    decisions.push({
      id: crypto.randomUUID(),
      type: "boost_pro",
      priority: "medium",
      payload: { proId: p.pro_id, score: p.overall_score },
      expectedImpact: 60,
      estimatedCost: 200,
    });
  }

  // Category boosts for high-demand areas
  const hotCategories = data.market.filter(m => (m.demand_signal ?? 0) > 60 && (m.listing_count ?? 0) > 3);
  for (const cat of hotCategories.slice(0, 3)) {
    decisions.push({
      id: crypto.randomUUID(),
      type: "boost_category",
      priority: "high",
      payload: { category: cat.category_name, demand: cat.demand_signal },
      expectedImpact: 70,
      estimatedCost: 100,
    });
  }

  // Growth engine run
  decisions.push({
    id: crypto.randomUUID(),
    type: "run_growth",
    priority: "high",
    payload: {},
    expectedImpact: 85,
    estimatedCost: 300,
  });

  // Partner rewards
  decisions.push({
    id: crypto.randomUUID(),
    type: "partner_rewards",
    priority: "medium",
    payload: {},
    expectedImpact: 75,
    estimatedCost: 200,
  });

  return decisions.sort((a, b) => b.expectedImpact - a.expectedImpact);
}

// =============================
// 3) BUDGET CONTROL
// =============================

function filterByBudget(decisions: CEODecision[], config: CEOConfig): CEODecision[] {
  let remaining = config.maxBudgetPerCycle;
  const approved: CEODecision[] = [];

  for (const d of decisions) {
    if (approved.length >= config.maxActions) break;
    if (remaining - d.estimatedCost < 0) continue;

    approved.push(d);
    remaining -= d.estimatedCost;
  }

  return approved;
}

// =============================
// 4) EXECUTION
// =============================

async function executeCEODecisions(decisions: CEODecision[]): Promise<CEOResult[]> {
  const results: CEOResult[] = [];

  for (const d of decisions) {
    try {
      switch (d.type) {
        case "expand_market":
          await runGlobalExpansion();
          break;
        case "boost_pro":
          await upgradeToPriorityPro(d.payload.proId as string, "priority");
          break;
        case "boost_category":
          await applyBoostOverride({
            entityId: d.payload.category as string,
            entityType: "category",
            multiplier: computeSmartBoost(d.expectedImpact, "rising"),
            reason: "ceo_decision",
            durationMs: 4 * 3600 * 1000,
          });
          break;
        case "run_growth":
          await runGrowthEngine();
          break;
        case "partner_rewards":
          await runPartnerEngine();
          break;
      }
      results.push({ ...d, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ ...d, success: false, message: msg });
    }
  }

  return results;
}

// =============================
// 5) LEARNING LOOP
// =============================

async function learnFromCEOResults(results: CEOResult[]): Promise<void> {
  const events = results.map(r => ({
    event_type: "v19_ceo_decision",
    entity_id: r.id,
    entity_type: "decision",
    metric: r.type,
    metadata_json: {
      success: r.success,
      priority: r.priority,
      impact: r.expectedImpact,
      cost: r.estimatedCost,
      message: r.message,
    } as unknown as Json,
    new_value: r.success ? 1 : 0,
    previous_value: 0,
  }));

  if (events.length) {
    await supabase.from("dino_learning_events").insert(events);
  }
}

// =============================
// 6) FULL CEO LOOP
// =============================

export async function runAICEO(config: Partial<CEOConfig> = {}): Promise<{
  mode: DinoMode;
  decisions: number;
  approved: number;
  succeeded: number;
  failed: number;
} | null> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (cfg.mode === "manual") return null;

  // 1) Collect
  const data = await collectCEOData();

  // 2) Decide
  const decisions = generateCEODecisions(data);

  // 3) Filter by budget + mode
  let approved = filterByBudget(decisions, cfg);
  if (cfg.mode === "semi_auto") {
    approved = approved.filter(d => d.priority === "critical");
  }

  // 4) Execute
  const results = await executeCEODecisions(approved);

  // 5) Learn
  await learnFromCEOResults(results);

  const succeeded = results.filter(r => r.success).length;
  return {
    mode: cfg.mode,
    decisions: decisions.length,
    approved: approved.length,
    succeeded,
    failed: approved.length - succeeded,
  };
}
