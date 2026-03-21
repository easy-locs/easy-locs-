/**
 * QR Payment Store — Generates canonical QR for wallet receive.
 * Uses qr-engine canonical format only.
 */
import { create } from "zustand";
import { encodeQr, qr } from "@/lib/qr-engine";
import { useAuth } from "@/contexts/AuthContext";

type QrPaymentStore = {
  qrString: string | null;
  lastReference: string | null;

  generateReceiveQr: (input: {
    userId: string;
    amount?: number;
    currency?: string;
    name?: string;
  }) => void;

  clear: () => void;
};

export const useQrPaymentStore = create<QrPaymentStore>((set) => ({
  qrString: null,
  lastReference: null,

  generateReceiveQr: ({ userId, amount, currency, name }) => {
    const qrString = encodeQr(qr.payUser(userId, { amount, currency: currency || "AED", name }));
    set({ qrString, lastReference: userId });
  },

  clear: () => {
    set({ qrString: null, lastReference: null });
  },
}));
