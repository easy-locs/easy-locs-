/**
 * Hybrid wallet engine — fiat + crypto + escrow + rewards accounts with double-entry ledger.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createWalletAccount(params: {
  workspaceId?: string;
  ownerUserId?: string;
  ownerType?: "user" | "workspace" | "merchant" | "driver";
  currency: string;
  accountType?: "fiat" | "crypto" | "escrow" | "rewards";
  externalRef?: string;
}) {
  const { data, error } = await supabase
    .from("wallet_accounts")
    .insert({
      workspace_id: params.workspaceId ?? null,
      owner_user_id: params.ownerUserId ?? null,
      owner_type: params.ownerType ?? "user",
      currency: params.currency,
      account_type: params.accountType ?? "fiat",
      external_ref: params.externalRef ?? null,
      balance: 0,
      available_balance: 0,
      pending_balance: 0,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function postWalletEntry(params: {
  workspaceId?: string;
  walletAccountId: string;
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  entryType: string;
  referenceType?: string;
  referenceId?: string;
  externalTxnId?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("wallet_ledger_entries")
    .insert({
      workspace_id: params.workspaceId ?? null,
      wallet_account_id: params.walletAccountId,
      direction: params.direction,
      amount: params.amount,
      currency: params.currency,
      entry_type: params.entryType,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      external_txn_id: params.externalTxnId ?? null,
      metadata: params.metadata ?? {},
      status: "posted",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function refreshWalletBalance(walletAccountId: string) {
  const { data: entries, error: entriesError } = await supabase
    .from("wallet_ledger_entries")
    .select("direction,amount,status")
    .eq("wallet_account_id", walletAccountId)
    .eq("status", "posted");

  if (entriesError) throw entriesError;

  const balance = (entries ?? []).reduce((sum: number, row: any) => {
    return sum + (row.direction === "credit" ? Number(row.amount) : -Number(row.amount));
  }, 0);

  const { data, error } = await supabase
    .from("wallet_accounts")
    .update({ balance, available_balance: balance })
    .eq("id", walletAccountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function transferBetweenWallets(params: {
  workspaceId?: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  transferType?: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}) {
  if (params.amount <= 0) throw new Error("Amount must be greater than 0");

  const { data: transfer, error: transferError } = await supabase
    .from("wallet_transfers")
    .insert({
      workspace_id: params.workspaceId ?? null,
      from_wallet_id: params.fromWalletId,
      to_wallet_id: params.toWalletId,
      amount: params.amount,
      currency: params.currency,
      transfer_type: params.transferType ?? "internal",
      status: "pending",
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (transferError) throw transferError;

  await postWalletEntry({
    workspaceId: params.workspaceId,
    walletAccountId: params.fromWalletId,
    direction: "debit",
    amount: params.amount,
    currency: params.currency,
    entryType: params.transferType ?? "internal",
    referenceType: "wallet_transfer",
    referenceId: transfer.id,
    metadata: params.metadata,
  });

  await postWalletEntry({
    workspaceId: params.workspaceId,
    walletAccountId: params.toWalletId,
    direction: "credit",
    amount: params.amount,
    currency: params.currency,
    entryType: params.transferType ?? "internal",
    referenceType: "wallet_transfer",
    referenceId: transfer.id,
    metadata: params.metadata,
  });

  await refreshWalletBalance(params.fromWalletId);
  await refreshWalletBalance(params.toWalletId);

  const { data, error } = await supabase
    .from("wallet_transfers")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", transfer.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
