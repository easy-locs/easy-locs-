import { createCheckoutPayment, confirmWalletOrCashOrder } from "@/lib/payments/paymentService";
import { holdEscrow } from "@/lib/wallet/ledger";
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import { APP_EVENTS } from "@/lib/platform/events";

function emitOrderCreated(params: {
  orderId: string;
  customerUserId: string;
  merchantId?: string | null;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
}) {
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId: params.orderId }, "checkout");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId: params.customerUserId }, "checkout");
  platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { userId: params.customerUserId }, "checkout");

  void eventBus.emit("order.payment.updated", {
    orderId: params.orderId,
    stage: "created",
    amount: params.totalAmount,
    paymentMethod: params.paymentMethod,
  });

  void eventBus.emit("orbit.payment.context", {
    orderId: params.orderId,
    stage: "created",
    amount: params.totalAmount,
    currency: params.currency,
  });
}

export async function placeOrderWithRealPayment(params: {
  orderId: string;
  total: number;
  currency: string;
  customerUserId: string;
  merchantId?: string | null;
  paymentMethod: "card" | "apple_pay" | "google_pay" | "wallet" | "cash";
}) {
  if (params.paymentMethod === "wallet") {
    await holdEscrow({
      customerUserId: params.customerUserId,
      amount: params.total,
      currency: params.currency,
      orderId: params.orderId,
    });

    await confirmWalletOrCashOrder({
      orderId: params.orderId,
      amount: params.total,
      currency: params.currency,
      customerUserId: params.customerUserId,
      merchantId: params.merchantId ?? null,
      paymentMethodType: "wallet",
    });

    platformBus.emit(APP_EVENTS.WALLET_PAYMENT_SUCCESS, {
      orderId: params.orderId,
      amount: params.total,
      currency: params.currency,
    }, "checkout");

    emitOrderCreated({ ...params, totalAmount: params.total, paymentMethod: "wallet" });
    return { mode: "wallet" as const, done: true };
  }

  if (params.paymentMethod === "cash") {
    await confirmWalletOrCashOrder({
      orderId: params.orderId,
      amount: params.total,
      currency: params.currency,
      customerUserId: params.customerUserId,
      merchantId: params.merchantId ?? null,
      paymentMethodType: "cash",
    });

    emitOrderCreated({ ...params, totalAmount: params.total, paymentMethod: "cash" });
    return { mode: "cash" as const, done: true };
  }

  const payment = await createCheckoutPayment({
    orderId: params.orderId,
    amount: params.total,
    currency: params.currency,
    customerUserId: params.customerUserId,
    merchantId: params.merchantId ?? null,
    paymentMethodType: params.paymentMethod,
  });

  emitOrderCreated({ ...params, totalAmount: params.total, paymentMethod: params.paymentMethod });
  return payment;
}
