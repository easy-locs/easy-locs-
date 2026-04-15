import { domainDb } from "@/services/db";
import type { WalletStateModel, WalletTransaction } from "@/domains/shared/canonical-types";

export { fetchCounterpartyNames } from "@/repositories/wallet-repository";

export const walletRepo = {
  async getByOwnerUserId(userId: string): Promise<WalletStateModel | null> {
    const { data, error } = await domainDb.wallet
      .from("wallet_accounts")
      .select("*")
      .eq("owner_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      walletId: data.id,
      ownerOrbitId: data.owner_user_id,
      currency: data.currency || "AED",
      availableBalance: data.available_balance ?? data.balance ?? 0,
      lockedBalance: data.balance_locked ?? 0,
      pendingBalance: data.pending_balance ?? 0,
      lastUpdatedAt: data.updated_at || data.created_at,
    } as WalletStateModel;
  },

  async createTransaction(tx: Omit<WalletTransaction, "id" | "createdAt"> & { senderId?: string }): Promise<WalletTransaction> {
    const { data, error } = await domainDb.wallet
      .from("wallet_transactions")
      .insert({
        sender_id: tx.senderId || null,
        amount: tx.amount,
        currency: tx.currency || "AED",
        context_type: tx.type,
        title: tx.type,
        subtitle: tx.reference || null,
        status: tx.status || "pending",
        metadata: { reference: tx.reference, source: "domain_wallet_repo" },
      } as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      type: data.context_type || tx.type,
      status: data.status || "pending",
      amount: data.amount,
      currency: data.currency || "AED",
      reference: data.subtitle || tx.reference,
      createdAt: data.created_at,
    } as WalletTransaction;
  },

  async listTransactions(userId: string, limit = 200) {
    const { data } = await domainDb.wallet
      .from("wallet_transactions")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  async getLedgerEntries(walletId: string, limit = 100) {
    const { data } = await domainDb.wallet
      .from("wallet_ledger_entries")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },
};
