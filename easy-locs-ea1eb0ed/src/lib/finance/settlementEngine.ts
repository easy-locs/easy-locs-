/**
 * settlementEngine — Commission calculation & merchant settlement logic.
 * Called after payment confirmation to create settlement entries and update balances.
 */
import { db } from "@/services/db";

const DEFAULT_PLATFORM_FEE_PERCENT = 5; // 5% commission
const DEFAULT_PROCESSING_FEE_PERCENT = 2.9; // Stripe-like processing

export interface SettlementInput {
  orderId: string;
  merchantAccountId: string;
  grossAmount: number;
  currency: string;
  platformFeePercent?: number;
  processingFeePercent?: number;
}

export function calculateCommission(params: {
  grossAmount: number;
  platformFeePercent?: number;
  processingFeePercent?: number;
}) {
  const platformPct = params.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
  const processingPct = params.processingFeePercent ?? DEFAULT_PROCESSING_FEE_PERCENT;

  const platformFee = Number((params.grossAmount * platformPct / 100).toFixed(2));
  const processingFee = Number((params.grossAmount * processingPct / 100).toFixed(2));
  const netAmount = Number((params.grossAmount - platformFee - processingFee).toFixed(2));

  return { platformFee, processingFee, netAmount };
}

export async function createSettlementEntry(input: SettlementInput) {
  const { platformFee, processingFee, netAmount } = calculateCommission({
    grossAmount: input.grossAmount,
    platformFeePercent: input.platformFeePercent,
    processingFeePercent: input.processingFeePercent,
  });

  // Insert settlement ledger entry
  const { data: entry, error: entryErr } = await db
    .from("settlement_ledger")
    .insert({
      merchant_id: input.merchantAccountId,
      order_id: input.orderId,
      gross_amount: input.grossAmount,
      platform_fee: platformFee,
      processing_fee: processingFee,
      net_amount: netAmount,
      currency: input.currency,
      status: "pending",
    })
    .select("*")
    .single();

  if (entryErr) throw entryErr;

  // Update merchant pending balance
  const { data: existing } = await db
    .from("merchant_balances")
    .select("*")
    .eq("merchant_id", input.merchantAccountId)
    .eq("currency", input.currency)
    .maybeSingle();

  if (existing) {
    await db
      .from("merchant_balances")
      .update({
        pending_balance: Number(existing.pending_balance) + netAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await db
      .from("merchant_balances")
      .insert({
        merchant_id: input.merchantAccountId,
        currency: input.currency,
        pending_balance: netAmount,
        available_balance: 0,
        locked_balance: 0,
      });
  }

  return entry;
}

export async function releaseSettlement(settlementId: string) {
  const { data: entry } = await db
    .from("settlement_ledger")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (!entry || entry.status !== "pending") return null;

  // Move from pending to available
  await db
    .from("settlement_ledger")
    .update({ status: "released" })
    .eq("id", settlementId);

  const { data: balance } = await db
    .from("merchant_balances")
    .select("*")
    .eq("merchant_id", entry.merchant_id)
    .eq("currency", entry.currency)
    .single();

  if (balance) {
    await db
      .from("merchant_balances")
      .update({
        pending_balance: Math.max(0, Number(balance.pending_balance) - entry.net_amount),
        available_balance: Number(balance.available_balance) + entry.net_amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", balance.id);
  }

  return entry;
}

export async function reverseSettlement(settlementId: string) {
  const { data: entry } = await db
    .from("settlement_ledger")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (!entry) return null;

  await db
    .from("settlement_ledger")
    .update({ status: "reversed" })
    .eq("id", settlementId);

  const { data: balance } = await db
    .from("merchant_balances")
    .select("*")
    .eq("merchant_id", entry.merchant_id)
    .eq("currency", entry.currency)
    .single();

  if (balance) {
    const field = entry.status === "released" ? "available_balance" : "pending_balance";
    await db
      .from("merchant_balances")
      .update({
        [field]: Math.max(0, Number(balance[field]) - entry.net_amount),
        updated_at: new Date().toISOString(),
      })
      .eq("id", balance.id);
  }

  return entry;
}

export async function getMerchantAccount(userId: string, shopId?: string) {
  let query = db
    .from("merchant_accounts")
    .select("*")
    .eq("user_id", userId);

  if (shopId) query = query.eq("shop_id", shopId);

  const { data } = await query.maybeSingle();
  return data;
}

export async function ensureMerchantAccount(userId: string, shopId: string, currency = "AED") {
  const existing = await getMerchantAccount(userId, shopId);
  if (existing) return existing;

  const { data, error } = await db
    .from("merchant_accounts")
    .insert({
      user_id: userId,
      shop_id: shopId,
      currency,
      kyc_status: "not_started",
      payout_enabled: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getMerchantBalances(merchantId: string) {
  const { data } = await db
    .from("merchant_balances")
    .select("*")
    .eq("merchant_id", merchantId);

  return data ?? [];
}

export async function getMerchantSettlements(merchantId: string, limit = 50) {
  const { data } = await db
    .from("settlement_ledger")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
