import { create } from "zustand";
import type {
  WalletStateModel,
  WalletTransaction,
  CurrencyCode,
} from "@/lib/types/app";
import { platformBus } from "@/app/events/platform-bus";

type WalletStore = {
  wallet: WalletStateModel | null;
  transactions: WalletTransaction[];
  loading: boolean;

  loadWallet: (input: {
    walletId: string;
    ownerOrbitId: string;
    currency?: CurrencyCode;
  }) => Promise<void>;

  createTransaction: (input: {
    type: WalletTransaction["type"];
    amount: number;
    currency?: CurrencyCode;
    status?: WalletTransaction["status"];
    reference?: string;
  }) => WalletTransaction;

  markTransactionSuccess: (transactionId: string) => void;
  markTransactionFailed: (transactionId: string, reason?: string) => void;
  lockEscrow: (amount: number, reference?: string) => WalletTransaction | null;
  releaseEscrow: (amount: number, reference?: string) => WalletTransaction | null;
};

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallet: null,
  transactions: [],
  loading: false,

  loadWallet: async ({ walletId, ownerOrbitId, currency = "AED" }) => {
    set({ loading: true });
    const wallet: WalletStateModel = {
      walletId,
      ownerOrbitId,
      currency,
      availableBalance: 0,
      lockedBalance: 0,
      pendingBalance: 0,
      lastUpdatedAt: new Date().toISOString(),
    };
    set({ wallet, loading: false });
    platformBus.emit({ type: "wallet.loaded", payload: { walletId, ownerOrbitId } });
  },

  createTransaction: ({ type, amount, currency, status = "pending", reference }) => {
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
    set((state) => ({ transactions: [tx, ...state.transactions] }));
    platformBus.emit({ type: "wallet.transaction.created", payload: { transaction: tx } });
    return tx;
  },

  markTransactionSuccess: (transactionId) => {
    const tx = get().transactions.find((item) => item.id === transactionId);
    if (!tx) return;
    set((state) => ({
      transactions: state.transactions.map((item) =>
        item.id === transactionId ? { ...item, status: "success" as const } : item
      ),
      wallet: state.wallet ? { ...state.wallet, lastUpdatedAt: new Date().toISOString() } : null,
    }));
    platformBus.emit({
      type: "wallet.payment.success",
      payload: { transactionId, amount: tx.amount, reference: tx.reference },
    });
  },

  markTransactionFailed: (transactionId, reason) => {
    set((state) => ({
      transactions: state.transactions.map((item) =>
        item.id === transactionId ? { ...item, status: "failed" as const } : item
      ),
    }));
    platformBus.emit({ type: "wallet.payment.failed", payload: { transactionId, reason } });
  },

  lockEscrow: (amount, reference) => {
    const wallet = get().wallet;
    if (!wallet || wallet.availableBalance < amount) return null;
    const tx = get().createTransaction({ type: "escrow_lock", amount, reference, status: "success" });
    set((state) => ({
      wallet: state.wallet
        ? {
            ...state.wallet,
            availableBalance: state.wallet.availableBalance - amount,
            lockedBalance: state.wallet.lockedBalance + amount,
            lastUpdatedAt: new Date().toISOString(),
          }
        : null,
    }));
    return tx;
  },

  releaseEscrow: (amount, reference) => {
    const wallet = get().wallet;
    if (!wallet || wallet.lockedBalance < amount) return null;
    const tx = get().createTransaction({ type: "escrow_release", amount, reference, status: "success" });
    set((state) => ({
      wallet: state.wallet
        ? {
            ...state.wallet,
            lockedBalance: state.wallet.lockedBalance - amount,
            lastUpdatedAt: new Date().toISOString(),
          }
        : null,
    }));
    return tx;
  },
}));
