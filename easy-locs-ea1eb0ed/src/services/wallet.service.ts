import { db, domainDb } from "./db";
import { fetchWalletBalanceByUserId } from "@/repositories/wallet-repository";

export interface WalletAccountRow {
  id: string;
  owner_user_id: string;
  balance: number;
  currency: string;
  account_type: string;
  status: string;
}

export interface WalletLedgerRow {
  id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  type: string;
  description: string | null;
  reference: string | null;
  created_at: string;
  status: string;
}

export const walletService = {
  async fetchAccount(userId: string) {
    const { data, error } = await domainDb.wallet
      .from("wallet_accounts")
      .select("*")
      .eq("owner_user_id", userId)
      .eq("account_type", "main")
      .maybeSingle() as { data: WalletAccountRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchBalance(userId: string) {
    const result = await fetchWalletBalanceByUserId(userId);
    if (!result) return null;
    return { balance: result.available, currency: result.currency };
  },

  async fetchLedgerEntries(walletId: string, limit = 50) {
    const { data, error } = await domainDb.wallet
      .from("wallet_ledger_entries")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: WalletLedgerRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchTransactionForUser(txId: string, userId: string) {
    const sanitized = userId.replace(/[^a-zA-Z0-9-]/g, "");
    const { data, error } = await db
      .from("unified_wallet_transactions")
      .select("*")
      .eq("id", txId)
      .or(`sender_id.eq.${sanitized},recipient_id.eq.${sanitized}`)
      .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };
    if (error) throw error;
    return data;
  },
};
