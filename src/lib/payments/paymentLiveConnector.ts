import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import { APP_EVENTS } from "@/lib/platform/events";

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
    await markOrderPaymentCaptured(params.orderId, "wallet_local");

    emitPaymentSuccess(params.orderId, params.amount, currency, params.customerUserId, "wallet");
    return { provider: "wallet", status: "succeeded" as const };
  }

  if (params.paymentMethod === "cash") {
    await markOrderPaymentPending(params.orderId, "cash_on_delivery");
    platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId: params.orderId }, "payment");
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

  emitPaymentSuccess(
    params.orderId,
    Number((order as any)?.total_amount ?? 0),
    (order as any)?.currency ?? "AED",
    (order as any)?.customer_user_id,
    "card"
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

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .maybeSingle();

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

  const customerId = (order as any)?.customer_user_id;

  // Canonical events
  void eventBus.emit("commerce.payment.reversed", {
    orderId: params.orderId,
    reason: params.reason ?? "admin_refund",
    stage: "reversed",
  });

  void eventBus.emit("order.payment.updated", {
    orderId: params.orderId,
    stage: "refunded",
  });

  platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { userId: customerId }, "payment");
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId: params.orderId }, "payment");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId: customerId }, "payment");

  return data;
}

// ── Shared helpers ──

function emitPaymentSuccess(
  orderId: string,
  amount: number,
  currency: string,
  customerUserId?: string | null,
  method?: string
) {
  platformBus.emit(APP_EVENTS.WALLET_PAYMENT_SUCCESS, {
    orderId,
    amount,
    currency,
    customerUserId,
    paymentMethodType: method,
  }, "payment");

  platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { userId: customerUserId }, "payment");

  void eventBus.emit("order.payment.updated", {
    orderId,
    stage: "captured",
    amount,
  });

  void eventBus.emit("orbit.payment.context", {
    orderId,
    stage: "captured",
    amount,
    currency,
  });

  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId }, "payment");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId: customerUserId }, "payment");
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
