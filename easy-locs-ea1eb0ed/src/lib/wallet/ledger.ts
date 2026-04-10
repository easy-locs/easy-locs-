/**
 * Wallet ledger operations — escrow, settlement, and refund flows.
 * P2P transfers use atomic_wallet_transfer RPC (see transactionChallenge.ts).
 * These functions remain for non-P2P flows: escrow, top-up, refund, settlement.
 *
 * SECURITY: All mutations require authenticated user, amount validation,
 * and idempotency to prevent duplicate financial operations.
 * MIGRATION TARGET: These should be moved to server-side edge functions.
 */
import { supabase } from "@/integrations/supabase/client";
import { getWalletDefaultCurrency } from "./wallet-config";
import { logger } from "@/lib/monitoring";

export type LedgerDirection = "in" | "out";
export type LedgerEntryType =
  | "top_up"
  | "payment"
  | "refund"
  | "transfer"
  | "escrow_hold"
  | "escrow_release"
  | "adjustment"
  | "payout";

const MAX_SINGLE_TRANSACTION = 100_000;
const processedIdempotencyKeys = new Set<string>();

async function requireAuth(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Wallet operation requires authentication");
  return user.id;
}

function validateAmount(amount: number, context: string): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount for ${context}: ${amount}`);
  }
  if (amount > MAX_SINGLE_TRANSACTION) {
    throw new Error(`Amount ${amount} exceeds maximum single transaction limit for ${context}`);
  }
}

function checkIdempotency(key: string): boolean {
  if (processedIdempotencyKeys.has(key)) return true;
  processedIdempotencyKeys.add(key);
  if (processedIdempotencyKeys.size > 500) {
    const first = processedIdempotencyKeys.values().next().value;
    if (first) processedIdempotencyKeys.delete(first);
  }
  return false;
}

export async function getOrCreateWalletAccount(params: {
  ownerUserId: string;
  currency?: string;
  accountType?: string;
}) {
  const authUserId = await requireAuth();
  if (params.ownerUserId !== authUserId) {
    logger.warn("[WALLET_AUDIT] Cross-user wallet access", {
      authUser: authUserId, targetUser: params.ownerUserId,
    });
  }

  const currency = params.currency ?? getWalletDefaultCurrency();
  const accountType = params.accountType ?? "fiat";

  const { data: existing, error: findErr } = await supabase
    .from("wallet_accounts")
    .select("*")
    .eq("owner_user_id", params.ownerUserId)
    .eq("currency", currency)
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("wallet_accounts")
    .insert({
      owner_user_id: params.ownerUserId,
      account_type: accountType,
      currency,
      balance: 0,
      available_balance: 0,
      status: "active",
    } as any)
    .select("*")
    .single();

  if (error) throw error;

  logger.info("[WALLET] Created new wallet account", {
    userId: params.ownerUserId, currency, accountType,
  });

  return data;
}

export async function createLedgerEntry(params: {
  walletAccountId: string;
  direction: LedgerDirection;
  amount: number;
  currency: string;
  entryType: LedgerEntryType;
  referenceId?: string | null;
  referenceType?: string | null;
  externalTxnId?: string | null;
  note?: string | null;
}) {
  await requireAuth();
  validateAmount(params.amount, `ledger_${params.entryType}`);

  const idempKey = `ledger:${params.walletAccountId}:${params.entryType}:${params.referenceId ?? "none"}:${params.amount}`;
  if (checkIdempotency(idempKey)) {
    logger.warn("[WALLET_SECURITY] Duplicate ledger entry blocked", {
      walletAccountId: params.walletAccountId, entryType: params.entryType, referenceId: params.referenceId,
    });
    throw new Error("Duplicate transaction detected — operation already processed");
  }

  logger.info("[WALLET_AUDIT] Creating ledger entry", {
    walletAccountId: params.walletAccountId,
    direction: params.direction,
    amount: params.amount,
    entryType: params.entryType,
    referenceId: params.referenceId,
  });

  const { data, error } = await supabase
    .from("wallet_ledger_entries")
    .insert({
      wallet_account_id: params.walletAccountId,
      direction: params.direction,
      amount: params.amount,
      currency: params.currency,
      entry_type: params.entryType,
      reference_id: params.referenceId ?? null,
      reference_type: params.referenceType ?? null,
      external_txn_id: params.externalTxnId ?? null,
      metadata: params.note ? { note: params.note } : {},
      status: "posted",
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function recomputeWalletBalance(walletAccountId: string) {
  await requireAuth();

  const { data: entries, error } = await supabase
    .from("wallet_ledger_entries")
    .select("direction, amount, status")
    .eq("wallet_account_id", walletAccountId)
    .eq("status", "posted");

  if (error) throw error;

  const balance = (entries ?? []).reduce((sum: number, row: any) => {
    const dir = row.direction === "in" || row.direction === "credit" ? 1 : -1;
    return sum + dir * Number(row.amount ?? 0);
  }, 0);

  const safeBalance = Math.max(0, Number(balance.toFixed(2)));

  logger.info("[WALLET_AUDIT] Recomputing balance", {
    walletAccountId, computedBalance: safeBalance, entryCount: entries?.length ?? 0,
  });

  const { data: updated, error: updateErr } = await supabase
    .from("wallet_accounts")
    .update({ balance: safeBalance, available_balance: safeBalance })
    .eq("id", walletAccountId)
    .select("*")
    .single();

  if (updateErr) throw updateErr;
  return updated;
}

export async function postWalletTransaction(params: {
  ownerUserId: string;
  amount: number;
  currency: string;
  direction: LedgerDirection;
  entryType: LedgerEntryType;
  referenceId?: string | null;
  referenceType?: string | null;
  externalTxnId?: string | null;
  note?: string | null;
}) {
  validateAmount(params.amount, params.entryType);

  const wallet = await getOrCreateWalletAccount({
    ownerUserId: params.ownerUserId,
    currency: params.currency,
  });

  if (params.direction === "out") {
    const currentBalance = Number((wallet as any).balance ?? (wallet as any).balance_cash ?? 0);
    if (currentBalance < params.amount) {
      logger.warn("[WALLET_SECURITY] Insufficient balance for debit", {
        walletId: wallet.id, balance: currentBalance, requested: params.amount, entryType: params.entryType,
      });
      throw new Error(`Insufficient wallet balance: ${currentBalance} < ${params.amount}`);
    }
  }

  const entry = await createLedgerEntry({
    walletAccountId: wallet.id,
    direction: params.direction,
    amount: params.amount,
    currency: params.currency,
    entryType: params.entryType,
    referenceId: params.referenceId ?? null,
    referenceType: params.referenceType ?? null,
    externalTxnId: params.externalTxnId ?? null,
    note: params.note ?? null,
  });

  const updatedWallet = await recomputeWalletBalance(wallet.id);
  return { wallet: updatedWallet, entry };
}

export async function holdEscrow(params: {
  customerUserId: string;
  amount: number;
  currency?: string;
  orderId: string;
}) {
  validateAmount(params.amount, "escrow_hold");
  return postWalletTransaction({
    ownerUserId: params.customerUserId,
    amount: params.amount,
    currency: params.currency ?? getWalletDefaultCurrency(),
    direction: "out",
    entryType: "escrow_hold",
    referenceId: params.orderId,
    referenceType: "order",
    note: "Escrow hold",
  });
}

export async function releaseEscrow(params: {
  merchantUserId: string;
  amount: number;
  currency?: string;
  orderId: string;
}) {
  validateAmount(params.amount, "escrow_release");
  return postWalletTransaction({
    ownerUserId: params.merchantUserId,
    amount: params.amount,
    currency: params.currency ?? getWalletDefaultCurrency(),
    direction: "in",
    entryType: "escrow_release",
    referenceId: params.orderId,
    referenceType: "order",
    note: "Escrow release",
  });
}

export const releaseEscrowToMerchant = releaseEscrow;

export async function postRefundToCustomer(params: {
  customerUserId: string;
  amount: number;
  currency?: string;
  orderId: string;
}) {
  validateAmount(params.amount, "refund");
  return postWalletTransaction({
    ownerUserId: params.customerUserId,
    amount: params.amount,
    currency: params.currency ?? getWalletDefaultCurrency(),
    direction: "in",
    entryType: "refund",
    referenceId: params.orderId,
    referenceType: "order",
    note: "Refund",
  });
}
