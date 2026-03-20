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
  amount: number;
  currency: string;
  direction: LedgerDirection;
  entryType: LedgerEntryType;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
}) {
  const { data, error } = await supabase
    .from("wallet_ledger_entries")
    .insert({
      wallet_account_id: params.walletAccountId,
      amount: params.amount,
      currency: params.currency,
      direction: params.direction,
      entry_type: params.entryType,
      reference_id: params.referenceId ?? null,
      reference_type: params.referenceType ?? null,
      note: params.note ?? null,
      status: "posted",
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function recomputeWalletBalance(walletAccountId: string) {
  const { data: entries, error: entriesErr } = await supabase
    .from("wallet_ledger_entries")
    .select("amount,direction,status")
    .eq("wallet_account_id", walletAccountId);

  if (entriesErr) throw entriesErr;

  const posted = (entries ?? []).filter((e: any) => (e.status ?? "posted") === "posted");
  const balance = posted.reduce((sum: number, row: any) => {
    return sum + (row.direction === "in" ? Number(row.amount ?? 0) : -Number(row.amount ?? 0));
  }, 0);

  const { data, error } = await supabase
    .from("wallet_accounts")
    .update({
      balance,
      available_balance: balance,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", walletAccountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function postWalletTransaction(params: {
  ownerUserId: string;
  amount: number;
  currency?: string;
  direction: LedgerDirection;
  entryType: LedgerEntryType;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
}) {
  const wallet = await getOrCreateWalletAccount({
    ownerUserId: params.ownerUserId,
    currency: params.currency ?? "AED",
  });

  const entry = await createLedgerEntry({
    walletAccountId: wallet.id,
    amount: Number(params.amount || 0),
    currency: params.currency ?? wallet.currency ?? "AED",
    direction: params.direction,
    entryType: params.entryType,
    referenceId: params.referenceId ?? null,
    referenceType: params.referenceType ?? null,
    note: params.note ?? null,
  });

  const updatedWallet = await recomputeWalletBalance(wallet.id);
  return { wallet: updatedWallet, entry };
}

export async function transferBetweenUsers(params: {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency?: string;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
}) {
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

export async function releaseEscrowToMerchant(params: {
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
