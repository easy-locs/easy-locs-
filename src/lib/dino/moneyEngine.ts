/**
 * DINO V12 — Money Engine
 * Commission + Dynamic Pricing + Wallet Integration + Profit Optimization
 * Integrates with existing wallet_accounts, wallet_ledger_entries, wallet_order_splits,
 * and commission_rules tables.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// =============================
// TYPES
// =============================

export interface DinoOrder {
  id: string;
  amount: number;
  category: string;
  city: string;
  country: string;
  currency: string;
  userId: string;
  proId: string;
  customerWalletId: string;
  merchantWalletId: string;
}

export interface CommissionResult {
  grossAmount: number;
  commission: number;
  netToPro: number;
  rate: number;
  surgeApplied: boolean;
}

// =============================
// 1) COMMISSION ENGINE
// =============================

/**
 * Resolves commission rate from existing commission_rules table.
 * Priority: vertical+city > vertical+country > vertical default.
 */
async function resolveCommissionRate(category: string, city: string, countryCode: string): Promise<{
  rate: number;
  discount: number;
  mode: string;
}> {
  // Try city-specific rule first
  const { data: cityRule } = await supabase
    .from("commission_rules")
    .select("commission_rate, commission_discount, commission_mode")
    .eq("vertical", category)
    .eq("country_code", countryCode)
    .eq("city", city)
    .eq("active", true)
    .maybeSingle();

  if (cityRule) {
    return { rate: cityRule.commission_rate, discount: cityRule.commission_discount, mode: cityRule.commission_mode };
  }

  // Fallback to country-level rule
  const { data: countryRule } = await supabase
    .from("commission_rules")
    .select("commission_rate, commission_discount, commission_mode")
    .eq("vertical", category)
    .eq("country_code", countryCode)
    .eq("active", true)
    .is("city", null)
    .maybeSingle();

  if (countryRule) {
    return { rate: countryRule.commission_rate, discount: countryRule.commission_discount, mode: countryRule.commission_mode };
  }

  // Default fallback: 5%
  return { rate: 5, discount: 0, mode: "percentage" };
}

export function computeCommission(
  amount: number,
  rate: number,
  discount: number,
  surgeMultiplier: number = 1
): CommissionResult {
  const effectiveRate = Math.max(0, (rate - discount) * surgeMultiplier);
  const commission = Math.round((amount * effectiveRate) / 100);

  return {
    grossAmount: amount,
    commission,
    netToPro: amount - commission,
    rate: effectiveRate,
    surgeApplied: surgeMultiplier > 1,
  };
}

// =============================
// 2) DYNAMIC PRICING ENGINE
// =============================

export function computeDynamicPrice(basePrice: number, demand: number, supply: number): number {
  const demandFactor = Math.min(demand, 100) / 100;
  const supplyFactor = supply > 0 ? Math.min(1, 10 / supply) : 1;

  const multiplier = 1 + demandFactor * 0.5 - (1 - supplyFactor) * 0.3;
  return Math.max(basePrice, Math.round(basePrice * Math.max(0.8, multiplier)));
}

// =============================
// 3) SURGE PRICING (LIVE)
// =============================

const MAX_SURGE_MULTIPLIER = 1.5;

export function computeSurgeMultiplier(demand: number): number {
  if (demand > 90) return MAX_SURGE_MULTIPLIER;
  if (demand > 80) return 1.3;
  if (demand > 70) return 1.15;
  return 1;
}

export function applySurgePricing(amount: number, demand: number): { amount: number; surgeMultiplier: number } {
  const multiplier = computeSurgeMultiplier(demand);
  return {
    amount: Math.round(amount * multiplier),
    surgeMultiplier: multiplier,
  };
}

// =============================
// 4) WALLET LEDGER INTEGRATION
// =============================

/**
 * Records a double-entry ledger transaction using existing wallet_ledger_entries.
 */
async function recordLedgerEntry(params: {
  walletAccountId: string;
  amount: number;
  currency: string;
  direction: "credit" | "debit";
  entryType: string;
  referenceId: string;
  referenceType: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("wallet_ledger_entries").insert({
    wallet_account_id: params.walletAccountId,
    amount: params.amount,
    currency: params.currency,
    direction: params.direction,
    entry_type: params.entryType,
    reference_id: params.referenceId,
    reference_type: params.referenceType,
    metadata: (params.metadata ?? {}) as Json,
    status: "completed",
  });

  if (error) throw new Error(`Ledger entry failed: ${error.message}`);
}

/**
 * Records order splits in wallet_order_splits for the existing financial system.
 */
async function recordOrderSplits(
  orderId: string,
  merchantWalletId: string,
  result: CommissionResult
) {
  const splits = [
    {
      order_id: orderId,
      wallet_account_id: merchantWalletId,
      split_party_type: "merchant",
      gross_amount: result.grossAmount,
      net_amount: result.netToPro,
      split_status: "settled",
      metadata: { commission: result.commission, rate: result.rate, surge: result.surgeApplied } as Json,
    },
  ];

  const { error } = await supabase.from("wallet_order_splits").insert(splits);
  if (error) throw new Error(`Order split failed: ${error.message}`);
}

// =============================
// 5) ORDER PROCESSOR (ESCROW-FIRST)
// =============================

/**
 * Processes an order using escrow-first flow:
 * 1) Debit buyer → escrow wallet (hold)
 * 2) On delivery confirmation → release escrow → credit merchant
 * Falls back to direct settlement if no escrow wallet is provided.
 */
export async function processOrder(order: DinoOrder & { escrowWalletId?: string }): Promise<CommissionResult> {
  // 1) Resolve commission rule
  const rule = await resolveCommissionRate(order.category, order.city, order.country);

  // 2) Get demand for surge
  const { data: marketData } = await supabase
    .from("dino_market_balance")
    .select("demand_signal")
    .eq("category_name", order.category)
    .eq("location_key", order.city)
    .maybeSingle();

  const demand = marketData?.demand_signal ?? 50;
  const surgeMultiplier = computeSurgeMultiplier(demand);

  // 3) Compute commission with surge
  const result = computeCommission(order.amount, rule.rate, rule.discount, surgeMultiplier);

  if (order.escrowWalletId) {
    // --- ESCROW FLOW ---
    // 4a) Debit customer → escrow hold
    await recordLedgerEntry({
      walletAccountId: order.customerWalletId,
      amount: order.amount,
      currency: order.currency,
      direction: "debit",
      entryType: "escrow_hold",
      referenceId: order.id,
      referenceType: "order",
      metadata: { category: order.category, city: order.city, escrow: true },
    });

    // 4b) Credit escrow wallet (hold)
    await recordLedgerEntry({
      walletAccountId: order.escrowWalletId,
      amount: order.amount,
      currency: order.currency,
      direction: "credit",
      entryType: "escrow_hold",
      referenceId: order.id,
      referenceType: "order",
      metadata: { merchantWallet: order.merchantWalletId, netToPro: result.netToPro, commission: result.commission },
    });
  } else {
    // --- DIRECT SETTLEMENT ---
    // 4) Debit customer wallet
    await recordLedgerEntry({
      walletAccountId: order.customerWalletId,
      amount: order.amount,
      currency: order.currency,
      direction: "debit",
      entryType: "order_payment",
      referenceId: order.id,
      referenceType: "order",
      metadata: { category: order.category, city: order.city },
    });

    // 5) Credit merchant wallet (net amount)
    await recordLedgerEntry({
      walletAccountId: order.merchantWalletId,
      amount: result.netToPro,
      currency: order.currency,
      direction: "credit",
      entryType: "order_revenue",
      referenceId: order.id,
      referenceType: "order",
      metadata: { commission: result.commission, rate: result.rate },
    });
  }

  // 6) Record order splits
  await recordOrderSplits(order.id, order.merchantWalletId, result);

  return result;
}

/**
 * Release escrow funds after delivery confirmation.
 * Debits escrow wallet → credits merchant with net amount.
 */
export async function releaseEscrowToMerchant(params: {
  orderId: string;
  escrowWalletId: string;
  merchantWalletId: string;
  grossAmount: number;
  netToPro: number;
  commission: number;
  currency: string;
}): Promise<void> {
  // Debit escrow wallet
  await recordLedgerEntry({
    walletAccountId: params.escrowWalletId,
    amount: params.grossAmount,
    currency: params.currency,
    direction: "debit",
    entryType: "escrow_release",
    referenceId: params.orderId,
    referenceType: "order",
    metadata: { release: true },
  });

  // Credit merchant (net)
  await recordLedgerEntry({
    walletAccountId: params.merchantWalletId,
    amount: params.netToPro,
    currency: params.currency,
    direction: "credit",
    entryType: "escrow_release",
    referenceId: params.orderId,
    referenceType: "order",
    metadata: { commission: params.commission },
  });
}

// =============================
// 6) AUTO PROFIT OPTIMIZER
// =============================

/**
 * Analyzes market balance and records optimization suggestions as learning events.
 * Does NOT directly mutate commission_rules (admin approval required).
 */
export async function optimizeRevenue(): Promise<Array<{ category: string; suggestedRate: number; reason: string }>> {
  const { data } = await supabase
    .from("dino_market_balance")
    .select("category_name, demand_signal, listing_count")
    .order("demand_signal", { ascending: false })
    .limit(50);

  if (!data) return [];

  const suggestions: Array<{ category: string; suggestedRate: number; reason: string }> = [];

  for (const row of data) {
    const demand = row.demand_signal ?? 0;
    const supply = row.listing_count ?? 1;

    let suggestedRate: number;
    let reason: string;

    if (demand > 70 && supply < 5) {
      suggestedRate = 15;
      reason = "high_demand_low_supply";
    } else if (demand > 50) {
      suggestedRate = 10;
      reason = "moderate_demand";
    } else {
      suggestedRate = 5;
      reason = "standard_market";
    }

    suggestions.push({ category: row.category_name, suggestedRate, reason });
  }

  // Record as learning events (not direct mutations)
  if (suggestions.length) {
    await supabase.from("dino_learning_events").insert(
      suggestions.map(s => ({
        event_type: "revenue_optimization_suggestion",
        entity_id: s.category,
        entity_type: "commission",
        metric: "suggested_rate",
        metadata_json: { reason: s.reason } as unknown as Json,
        new_value: s.suggestedRate,
        previous_value: 0,
      }))
    );
  }

  return suggestions;
}

// =============================
// 7) FULL MONEY LOOP
// =============================

export async function runMoneyEngine(order: DinoOrder): Promise<CommissionResult> {
  // 1) Process order with commission + surge + ledger
  const result = await processOrder(order);

  // 2) Record learning
  await supabase.from("dino_learning_events").insert([{
    event_type: "v12_order_processed",
    entity_id: order.id,
    entity_type: "order",
    metric: "revenue",
    metadata_json: {
      commission: result.commission,
      netToPro: result.netToPro,
      rate: result.rate,
      surgeApplied: result.surgeApplied,
      category: order.category,
      city: order.city,
    } as unknown as Json,
    new_value: result.commission,
    previous_value: 0,
  }]);

  return result;
}
