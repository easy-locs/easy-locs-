import { createLiveCheckoutSession, LivePaymentMethod } from "./paymentLiveConnector";

export async function submitUnifiedCheckout(params: {
  orderId: string;
  amount: number;
  currency?: string;
  paymentMethod: LivePaymentMethod;
  customerUserId?: string | null;
  merchantId?: string | null;
}) {
  const session = await createLiveCheckoutSession({
    orderId: params.orderId,
    amount: params.amount,
    currency: params.currency ?? "AED",
    paymentMethod: params.paymentMethod,
    customerUserId: params.customerUserId ?? null,
    merchantId: params.merchantId ?? null,
  });

  return session;
}
