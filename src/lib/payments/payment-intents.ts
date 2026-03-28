import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/guest-session";
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { notifyPaymentSuccess, notifyPaymentFailed } from "@/lib/engines/notification-event-dispatcher";

async function tryGetCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function createPaymentIntent(params: {
  workspaceId?: string;
  orderId?: string;
  cartId?: string;
  provider?: "stripe" | "checkout" | "cash" | "wallet" | "mixed" | "manual";
  currency?: string;
  amount: number;
  paymentMethodType?: "card" | "apple_pay" | "wallet" | "cash";
  metadata?: Record<string, any>;
}) {
  const userId = await tryGetCurrentUserId();
  const guestId = userId ? null : getGuestId();

  const { data, error } = await (supabase as any)
    .from("payment_intents")
    .insert({
      workspace_id: params.workspaceId ?? null,
      order_id: params.orderId ?? null,
      cart_id: params.cartId ?? null,
      user_id: userId,
      guest_id: guestId,
      provider: params.provider ?? "manual",
      currency: params.currency ?? "AED",
      amount: params.amount,
      status: "created",
      payment_method_type: params.paymentMethodType ?? "card",
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;

  // Emit intent prepared
  void eventBus.emit("commerce.intent.prepared", {
    orderId: params.orderId,
    paymentIntentId: data.id,
    amount: params.amount,
    currency: params.currency ?? "AED",
  });

  return data;
}

export async function markPaymentIntentPaid(paymentIntentId: string, externalIntentId?: string) {
  const { data, error } = await (supabase as any)
    .from("payment_intents")
    .update({
      status: "paid",
      external_intent_id: externalIntentId ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", paymentIntentId)
    .select("*")
    .single();

  if (error) throw error;

  const userId = data?.user_id;
  const orderId = data?.order_id;
  const amount = Number(data?.amount ?? 0);
  const currency = data?.currency ?? "AED";

  // 1. Wallet payment success
  platformBus.emit(APP_EVENTS.WALLET_PAYMENT_SUCCESS, {
    paymentIntentId,
    orderId,
    amount,
    currency,
  }, "payment");

  // 2. Wallet balance refresh
  platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { userId }, "payment");

  // 3. Order payment updated
  void eventBus.emit("order.payment.updated", {
    orderId,
    stage: "captured",
    paymentIntentId,
    amount,
  });

  // 4. Orbit payment context
  void eventBus.emit("orbit.payment.context", {
    orderId,
    stage: "captured",
    amount,
    currency,
  });

  // 5. Notification
  if (userId) {
    notifyPaymentSuccess(userId, paymentIntentId, amount, currency).catch(console.error);
  }

  // 6. Dashboard + notification refresh
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId }, "payment");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId }, "payment");

  return data;
}

export async function markPaymentIntentFailed(paymentIntentId: string, reason?: string) {
  const { data, error } = await (supabase as any)
    .from("payment_intents")
    .update({
      status: "failed",
      metadata: { failure_reason: reason },
    })
    .eq("id", paymentIntentId)
    .select("*")
    .single();

  if (error) throw error;

  const userId = data?.user_id;
  const orderId = data?.order_id;

  // 1. Wallet payment failed
  platformBus.emit(APP_EVENTS.WALLET_PAYMENT_FAILED, {
    paymentIntentId,
    orderId,
    reason,
  }, "payment");

  // 2. Order payment updated
  void eventBus.emit("order.payment.updated", {
    orderId,
    stage: "failed",
    paymentIntentId,
    reason,
  });

  // 3. Notification
  if (userId) {
    notifyPaymentFailed(userId, paymentIntentId, reason ?? "Payment failed").catch(console.error);
  }

  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId }, "payment");

  return data;
}
