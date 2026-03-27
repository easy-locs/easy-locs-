import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type { WalletStateModel, WalletTransaction, CurrencyCode } from "@/lib/types/domain";
import { walletRepo } from "@/lib/supabase/repositories";
import { ensureWalletAccount } from "@/lib/wallet/ensureWalletAccount";

type WalletStore = {
  wallet: WalletStateModel | null;
  transactions: WalletTransaction[];
  loading: boolean;
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

  loadWallet: async ({ walletId, ownerOrbitId, currency = "AED" }) => {
    set({ loading: true });
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

    platformBus.emit("wallet:loaded", { walletId: wallet.walletId, ownerOrbitId: wallet.ownerOrbitId }, "wallet");
  },

  createTransaction: async ({ type, amount, currency, status = "pending", reference }) => {
    const wallet = get().wallet;
    const tx: WalletTransaction = {
      id: `tx_${Math.random().toString(36).slice(2, 11)}`,
      type,
      status,
      amount,
      currency: currency ?? wallet?.currency ?? "AED",
      reference,
      createdAt: new Date().toISOString(),
    };

    const saved = await walletRepo.createTransaction(tx);

    set((state) => ({
      transactions: [saved, ...state.transactions],
    }));

    platformBus.emit("wallet:transaction_created", { transaction: saved }, "wallet");

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

    platformBus.emit("wallet:payment_success", {
      transactionId,
      amount: tx.amount,
      reference: tx.reference,
    }, "wallet");
  },

  markTransactionFailed: (transactionId, reason) => {
    set((state) => ({
      transactions: state.transactions.map((item) =>
        item.id === transactionId ? { ...item, status: "failed" as const } : item
      ),
    }));

    platformBus.emit("wallet:payment_failed", { transactionId, reason }, "wallet");
  },
}));
