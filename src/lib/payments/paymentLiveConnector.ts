import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/orchestration/platformBus";

export type LivePaymentMethod = "card" | "wallet" | "cash";

export async function createLiveCheckoutSession(params: {
  orderId: string;
  amount: number;
  currency?: string;
  paymentMethod: LivePaymentMethod;
  customerUserId?: string | null;
  merchantId?: string | null;
}) {
  const currency = params.currency ?? "AED";

  if (params.paymentMethod === "wallet") {
    await markOrderPaymentPending(params.orderId, "wallet");
    await platformBus.emit(
      "PAYMENT_SUCCESS",
      {
        orderId: params.orderId,
        amount: params.amount,
        currency,
        customerUserId: params.customerUserId ?? null,
        merchantId: params.merchantId ?? null,
        paymentMethodType: "wallet",
      },
      { source: "paymentLiveConnector:wallet" }
    );

    await markOrderPaymentCaptured(params.orderId, "wallet_local");
    return { provider: "wallet", status: "succeeded" as const };
  }

  if (params.paymentMethod === "cash") {
    await markOrderPaymentPending(params.orderId, "cash_on_delivery");
    return { provider: "cash", status: "pending" as const };
  }

  const { data, error } = await supabase.functions.invoke("create-checkout-payment", {
    body: {
      orderId: params.orderId,
      amount: params.amount,
      currency,
    },
  });

  if (error) throw error;

  await markOrderPaymentPending(params.orderId, data?.paymentIntentId ?? "stripe_pending");

  return {
    provider: "stripe",
    status: data?.status ?? "pending",
    clientSecret: data?.clientSecret ?? null,
    checkoutUrl: data?.checkoutUrl ?? null,
    paymentIntentId: data?.paymentIntentId ?? null,
  };
}

export async function captureLiveCardPayment(params: {
  orderId: string;
  paymentIntentId: string;
}) {
  const { data, error } = await supabase.functions.invoke("capture-payment", {
    body: {
      orderId: params.orderId,
      paymentIntentId: params.paymentIntentId,
    },
  });

  if (error) throw error;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .maybeSingle();

  await markOrderPaymentCaptured(params.orderId, params.paymentIntentId);

  await platformBus.emit(
    "PAYMENT_SUCCESS",
    {
      orderId: params.orderId,
      amount: Number((order as any)?.total_amount ?? 0),
      currency: (order as any)?.currency ?? "AED",
      customerUserId: (order as any)?.customer_user_id ?? null,
      merchantId: (order as any)?.merchant_id ?? null,
      paymentMethodType: "card",
    },
    { source: "paymentLiveConnector:capture" }
  );

  return data;
}

export async function refundLivePayment(params: {
  orderId: string;
  paymentIntentId?: string | null;
  reason?: string;
}) {
  const { data, error } = await supabase.functions.invoke("refund-payment", {
    body: {
      orderId: params.orderId,
      paymentIntentId: params.paymentIntentId ?? null,
      reason: params.reason ?? "admin_refund",
    },
  });

  if (error) throw error;

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: "refunded",
      status: "refunded",
      refund_reason: params.reason ?? "admin_refund",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.orderId);

  if (updateError) throw updateError;

  await platformBus.emit(
    "ORDER_REFUNDED",
    { orderId: params.orderId, reason: params.reason ?? "admin_refund" },
    { source: "paymentLiveConnector:refund" }
  );

  return data;
}

async function markOrderPaymentPending(orderId: string, paymentIntentId: string) {
  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: "pending",
      payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", orderId);

  if (error) throw error;
}

async function markOrderPaymentCaptured(orderId: string, paymentIntentId: string) {
  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: "captured",
      payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", orderId);

  if (error) throw error;
}
