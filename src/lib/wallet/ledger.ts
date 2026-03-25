/**
 * DEPRECATED — Legacy client-side ledger operations.
 * REPLACED_BY: atomic_wallet_transfer RPC for transfers, wallet-transfer edge function for P2P.
 * 
 * transferBetweenUsers is NOT atomic — use executeSecureTransfer() instead.
 * postWalletTransaction / recomputeWalletBalance kept for non-P2P flows (escrow, top-up).
 * TO_REMOVE: transferBetweenUsers after all callers migrated.
 */
import { supabase } from "@/integrations/supabase/client";

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

export async function getOrCreateWalletAccount(params: {
  ownerUserId: string;
  currency?: string;
  accountType?: string;
}) {
  const currency = params.currency ?? "AED";
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

  const { data: updated, error: updateErr } = await supabase
    .from("wallet_accounts")
    .update({ balance, available_balance: balance })
    .eq("id", walletAccountId)
    .select("*")
    .single();

  if (updateErr) throw updateErr;
  return updated;
}

/** Post a wallet transaction: create ledger entry + recompute balance */
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
  const wallet = await getOrCreateWalletAccount({
    ownerUserId: params.ownerUserId,
    currency: params.currency,
  });

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

/**
 * DEPRECATED — NOT atomic. Use executeSecureTransfer() from transactionChallenge.ts instead.
 * REPLACED_BY: wallet-transfer edge function → atomic_wallet_transfer RPC
 * TO_REMOVE after all callers migrated.
 */
export async function transferBetweenUsers(params: {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency?: string;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
}) {
  console.warn("[DEPRECATED] transferBetweenUsers is not atomic. Use executeSecureTransfer() instead.");
  const currency = params.currency ?? "AED";

  await postWalletTransaction({
    ownerUserId: params.fromUserId,
    amount: params.amount,
    currency,
    direction: "out",
    entryType: "transfer",
    referenceId: params.referenceId ?? null,
    referenceType: params.referenceType ?? null,
    note: params.note ?? null,
  });

  await postWalletTransaction({
    ownerUserId: params.toUserId,
    amount: params.amount,
    currency,
    direction: "in",
    entryType: "transfer",
    referenceId: params.referenceId ?? null,
    referenceType: params.referenceType ?? null,
    note: params.note ?? null,
  });
}

/** Hold escrow for an order */
export async function holdEscrow(params: {
  customerUserId: string;
  amount: number;
  currency?: string;
  orderId: string;
}) {
  return postWalletTransaction({
    ownerUserId: params.customerUserId,
    amount: params.amount,
    currency: params.currency ?? "AED",
    direction: "out",
    entryType: "escrow_hold",
    referenceId: params.orderId,
    referenceType: "order",
    note: "Escrow hold",
  });
}

/** Release escrow to merchant */
export async function releaseEscrow(params: {
  merchantUserId: string;
  amount: number;
  currency?: string;
  orderId: string;
}) {
  return postWalletTransaction({
    ownerUserId: params.merchantUserId,
    amount: params.amount,
    currency: params.currency ?? "AED",
    direction: "in",
    entryType: "escrow_release",
    referenceId: params.orderId,
    referenceType: "order",
    note: "Escrow release",
  });
}

/** Alias for releaseEscrow — used by settlement engine */
export const releaseEscrowToMerchant = releaseEscrow;

/** Post refund credit to customer wallet */
export async function postRefundToCustomer(params: {
  customerUserId: string;
  amount: number;
  currency?: string;
  orderId: string;
}) {
  return postWalletTransaction({
    ownerUserId: params.customerUserId,
    amount: params.amount,
    currency: params.currency ?? "AED",
    direction: "in",
    entryType: "refund",
    referenceId: params.orderId,
    referenceType: "order",
    note: "Refund",
  });
}
