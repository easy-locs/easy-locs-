/**
 * FAMILY: WALLET-BRIDGE — Canonical bridge between Orbit and Wallet.
 * Enables payment requests/receipts/events in threads.
 * Orbit consumes wallet truth, never invents financial logic.
 */
import { sendPaymentRequest, sendPaymentReceipt, sendPaymentEvent } from "@/families/send/send-payment";
import type { SendContext } from "@/families/send/send-context";

export const OrbitWalletBridge = {
  /** Send a payment request into the thread */
  async requestPayment(ctx: SendContext, amount: number, currency: string, description?: string) {
    return sendPaymentRequest(ctx, amount, currency, description);
  },

  /** Send a payment receipt confirmation into the thread */
  async confirmPayment(ctx: SendContext, amount: number, currency: string, transactionId: string) {
    return sendPaymentReceipt(ctx, amount, currency, transactionId);
  },

  /** Send a financial event notification into the thread */
  async notifyPaymentEvent(
    ctx: SendContext,
    eventType: "authorized" | "captured" | "settled" | "reversed" | "failed",
    amount: number,
    currency: string,
    transactionId: string,
  ) {
    return sendPaymentEvent(ctx, eventType, amount, currency, transactionId);
  },
};
