/**
 * P0 Bridge — commerce:payment_* events
 * 
 * V3: Emits SPECIFIC wallet events instead of lossy "wallet.updated".
 * Each commerce stage maps to its own canonical event.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";

const COMMERCE_PAYMENT_BRIDGE: Record<string, { walletEvents: string[]; notifType: string }> = {
  "commerce:intent_prepared": {
    walletEvents: ["commerce.intent.prepared", "wallet.balance.refresh"],
    notifType: "payment_intent_prepared",
  },
  "commerce:payment_authorized": {
    walletEvents: ["commerce.payment.authorized", "wallet.balance.refresh"],
    notifType: "payment_authorized",
  },
  "commerce:payment_captured": {
    walletEvents: ["commerce.payment.captured", "wallet.balance.refresh"],
    notifType: "payment_captured",
  },
  "commerce:payment_settled": {
    walletEvents: ["commerce.payment.settled", "wallet.balance.refresh"],
    notifType: "payment_settled",
  },
  "commerce:payment_reversed": {
    walletEvents: ["commerce.payment.reversed", "wallet.balance.refresh"],
    notifType: "payment_reversed",
  },
};

for (const [commerceEvent, targets] of Object.entries(COMMERCE_PAYMENT_BRIDGE)) {
  platformBus.on(commerceEvent, (event) => {
    const payload = typeof event.payload === "object" && event.payload !== null
      ? event.payload
      : {};
    const orderId = (payload as Record<string, any>).orderId;
    const stage = (payload as Record<string, any>).stage;

    console.log(`[commerce-payment-bridge] ${commerceEvent} → propagating (order: ${orderId}, stage: ${stage})`);

    // 1. Specific wallet events (replaces lossy wallet.updated)
    for (const walletEvent of targets.walletEvents) {
      void eventBus.emit(walletEvent, {
        orderId,
        stage,
        _bridgedFrom: commerceEvent,
      });
    }

    // 2. Order/job payment state update
    void eventBus.emit("order.payment.updated", {
      orderId,
      stage,
      paymentEvent: commerceEvent,
    });

    // 3. Orbit payment context
    void eventBus.emit("orbit.payment.context", {
      orderId,
      stage,
      notifType: targets.notifType,
    });

    // 4. Notification trigger
    void eventBus.emit("notification.payment", {
      orderId,
      stage,
      type: targets.notifType,
    });
  });
}

console.log("[commerce-payment-bridge] V3 — Commerce payment bridge registered with distinct events");
