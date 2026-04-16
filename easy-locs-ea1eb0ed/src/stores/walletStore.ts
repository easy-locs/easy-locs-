import { db } from "@/services/db";
import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type { WalletStateModel, WalletTransaction, CurrencyCode } from "@/domains/shared/canonical-types";
import { walletRepo } from "@/lib/db/repositories";
import { ensureWalletAccount } from "@/lib/wallet/ensureWalletAccount";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { crossTabSync, TAB_SYNC_CHANNELS } from "@/lib/cross-tab-sync";

type WalletStore = {
  wallet: WalletStateModel | null;
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  loadWallet: (input: { walletId: string; ownerOrbitId: string; currency?: CurrencyCode }) => Promise<void>;
  createTransaction: (input: {
    type: WalletTransaction["type"];
    amount: number;
    currency?: CurrencyCode;
    status?: WalletTransaction["status"];
    reference?: string;
  }) => Promise<WalletTransaction>;
  markTransactionSuccess: (transactionId: string) => void;
  markTransactionFailed: (transactionId: string, reason?: string) => void;
};

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallet: null,
  transactions: [],
  loading: false,
  error: null,

  loadWallet: async ({ walletId, ownerOrbitId, currency = getWalletDefaultCurrency() as CurrencyCode }) => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
    let wallet = await walletRepo.getByOwnerOrbitId(ownerOrbitId);

    if (!wallet) {
      await ensureWalletAccount(ownerOrbitId, currency);
      wallet = await walletRepo.getByOwnerOrbitId(ownerOrbitId);
    }

    if (!wallet) {
      set({ wallet: null, loading: false });
      return;
    }

    set({ wallet, loading: false });

    crossTabSync.publish(TAB_SYNC_CHANNELS.WALLET_BALANCE, {
      balance: wallet.balance,
      currency: wallet.currency,
      walletId: wallet.walletId,
    });

    platformBus.emit("wallet:loaded", { walletId: wallet.walletId, ownerOrbitId: wallet.ownerOrbitId }, "wallet");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown wallet error";
      console.error("[walletStore] loadWallet failed:", err);
      structuredLogger.error("wallet", "load_failed", message);
      set({ loading: false, error: message });
      platformBus.emit("wallet:error", { error: message, ownerOrbitId }, "wallet");
    }
  },

  createTransaction: async ({ type, amount, currency, status = "pending", reference }) => {
    const wallet = get().wallet;
    const tx: WalletTransaction = {
      id: `tx_${crypto.randomUUID()}`,
      type,
      status,
      amount,
      currency: currency ?? wallet?.currency ?? getWalletDefaultCurrency() as CurrencyCode,
      reference,
      createdAt: new Date().toISOString(),
    };

    const saved = await walletRepo.createTransaction(tx);

    set((state) => ({
      transactions: [saved, ...state.transactions],
    }));

    const walletBalance = get().wallet?.balance ?? null;
    crossTabSync.publish(TAB_SYNC_CHANNELS.WALLET_BALANCE, {
      balance: walletBalance,
      currency: saved.currency,
    });
    platformBus.emit("wallet:transaction_created", { transaction: saved, walletBalance }, "wallet");

    return saved;
  },

  markTransactionSuccess: (transactionId) => {
    const tx = get().transactions.find((item) => item.id === transactionId);
    if (!tx) return;

    set((state) => ({
      transactions: state.transactions.map((item) =>
        item.id === transactionId ? { ...item, status: "success" as const } : item
      ),
    }));

    db.from("wallet_transactions")
      .update({ status: "success" })
      .eq("id", transactionId)
      .then(({ error }) => {
        if (error) {
          structuredLogger.error("wallet", "persistence_failure", `Failed to persist transaction success: ${error.message} (tx: ${transactionId})`);
        }
      });

    platformBus.emit("wallet:payment_success", {
      transactionId,
      amount: tx.amount,
      currency: tx.currency,
      reference: tx.reference,
      walletBalance: get().wallet?.balance ?? null,
    }, "wallet");
  },

  markTransactionFailed: (transactionId, reason) => {
    set((state) => ({
      transactions: state.transactions.map((item) =>
        item.id === transactionId ? { ...item, status: "failed" as const } : item
      ),
    }));

    platformBus.emit("wallet:payment_failed", { transactionId, reason }, "wallet");
    structuredLogger.error("wallet", "runtime_failure", `Wallet payment failed: ${reason ?? "unknown"} (tx: ${transactionId})`);
  },
}));
