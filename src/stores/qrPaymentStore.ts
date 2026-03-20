import { create } from "zustand";
import { buildMockQrPaymentString } from "@/lib/utils/qr";
import { useWalletStore } from "@/stores/walletStore";

type QrPaymentStore = {
  qrString: string | null;
  lastReference: string | null;

  generateListingPaymentQr: (input: {
    amount: number;
    reference: string;
  }) => void;

  clear: () => void;
};

export const useQrPaymentStore = create<QrPaymentStore>((set) => ({
  qrString: null,
  lastReference: null,

  generateListingPaymentQr: ({ amount, reference }) => {
    const wallet = useWalletStore.getState().wallet;
    if (!wallet) return;

    const qrString = buildMockQrPaymentString({
      walletId: wallet.walletId,
      amount,
      currency: wallet.currency,
      reference,
    });

    set({
      qrString,
      lastReference: reference,
    });
  },

  clear: () => {
    set({
      qrString: null,
      lastReference: null,
    });
  },
}));
