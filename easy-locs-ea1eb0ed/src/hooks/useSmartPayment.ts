import { useCallback, useMemo } from "react";
import { useUnifiedPayment, type PaymentRequest, type PaymentResult, type PaymentContextType } from "@/payments/UnifiedPaymentSystem";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";

export type SmartPaymentContext =
  | { source: "contact"; userId: string; displayName: string; phone?: string }
  | { source: "orbit"; threadId: string; peerId: string; peerName: string }
  | { source: "qr"; recipientId: string; recipientName: string; amount?: number; currency?: string }
  | { source: "booking"; bookingId: string; providerId: string; providerName: string; amount: number; currency?: string }
  | { source: "service"; serviceId: string; providerId: string; providerName: string; amount: number; currency?: string }
  | { source: "shop"; shopId: string; shopName: string; amount: number; currency?: string }
  | { source: "link"; linkId: string; recipientId: string; recipientName: string; amount: number; currency?: string };

function mapContextType(source: SmartPaymentContext["source"]): PaymentContextType {
  switch (source) {
    case "contact": return "generic";
    case "orbit": return "chat";
    case "qr": return "generic";
    case "booking": return "order";
    case "service": return "order";
    case "shop": return "shop";
    case "link": return "generic";
    default: return "generic";
  }
}

function buildPaymentRequest(
  ctx: SmartPaymentContext,
  amount: number,
  currency: string,
): PaymentRequest {
  const contextType = mapContextType(ctx.source);

  switch (ctx.source) {
    case "contact":
      return {
        amount,
        currency,
        title: `Pay ${ctx.displayName}`,
        subtitle: ctx.phone || "Contact payment",
        recipientId: ctx.userId,
        recipientName: ctx.displayName,
        contextType,
        metadata: { source: "smart_pay", origin: "contact" },
      };

    case "orbit":
      return {
        amount,
        currency,
        title: `Pay ${ctx.peerName}`,
        subtitle: "Orbit payment",
        recipientId: ctx.peerId,
        recipientName: ctx.peerName,
        contextType,
        contextId: ctx.threadId,
        metadata: { source: "smart_pay", origin: "orbit", thread_id: ctx.threadId },
      };

    case "qr":
      return {
        amount: ctx.amount || amount,
        currency: ctx.currency || currency,
        title: `Pay ${ctx.recipientName}`,
        subtitle: "QR payment",
        recipientId: ctx.recipientId,
        recipientName: ctx.recipientName,
        contextType,
        metadata: { source: "smart_pay", origin: "qr" },
      };

    case "booking":
      return {
        amount: ctx.amount,
        currency: ctx.currency || currency,
        title: `Pay ${ctx.providerName}`,
        subtitle: "Booking payment",
        recipientId: ctx.providerId,
        recipientName: ctx.providerName,
        contextType,
        contextId: ctx.bookingId,
        metadata: { source: "smart_pay", origin: "booking", booking_id: ctx.bookingId },
      };

    case "service":
      return {
        amount: ctx.amount,
        currency: ctx.currency || currency,
        title: `Pay ${ctx.providerName}`,
        subtitle: "Service payment",
        recipientId: ctx.providerId,
        recipientName: ctx.providerName,
        contextType,
        contextId: ctx.serviceId,
        metadata: { source: "smart_pay", origin: "service", service_id: ctx.serviceId },
      };

    case "shop":
      return {
        amount: ctx.amount,
        currency: ctx.currency || currency,
        title: `Pay ${ctx.shopName}`,
        subtitle: "Shop payment",
        recipientId: ctx.shopId,
        recipientName: ctx.shopName,
        contextType,
        contextId: ctx.shopId,
        metadata: { source: "smart_pay", origin: "shop" },
      };

    case "link":
      return {
        amount: ctx.amount,
        currency: ctx.currency || currency,
        title: `Pay ${ctx.recipientName}`,
        subtitle: "Payment link",
        recipientId: ctx.recipientId,
        recipientName: ctx.recipientName,
        contextType,
        contextId: ctx.linkId,
        metadata: { source: "smart_pay", origin: "link", link_id: ctx.linkId },
      };
  }
}

export function useSmartPayment() {
  const { openPayment } = useUnifiedPayment();
  const { user } = useAuth();
  const { balance, currency: walletCurrency } = useWalletBalance();

  const pay = useCallback(async (
    ctx: SmartPaymentContext,
    amount?: number,
  ): Promise<PaymentResult> => {
    if (!user?.id) {
      return { ok: false, error: "Not signed in" };
    }

    const finalAmount = amount
      || ("amount" in ctx ? ctx.amount : 0)
      || 0;

    if (finalAmount <= 0) {
      return { ok: false, error: "Invalid amount" };
    }

    const currency = ("currency" in ctx && ctx.currency) || walletCurrency || "AED";

    if (finalAmount > balance) {
      return { ok: false, error: "Insufficient balance" };
    }

    const request = buildPaymentRequest(ctx, finalAmount, currency);
    return openPayment(request);
  }, [openPayment, user?.id, balance, walletCurrency]);

  const canPay = useCallback((amount: number): boolean => {
    return !!user?.id && amount > 0 && amount <= balance;
  }, [user?.id, balance]);

  return useMemo(() => ({
    pay,
    canPay,
    balance,
    currency: walletCurrency || "AED",
    isReady: !!user?.id,
  }), [pay, canPay, balance, walletCurrency, user?.id]);
}
