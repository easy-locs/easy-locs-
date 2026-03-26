/**
 * P0 Bridge — commerce:payment_* events
 * 
 * Owner: Wallet + Execution Brain
 * 
 * These events are emitted by wallet-engine.ts but were not consumed.
 * This bridge propagates them to:
 * - wallet balance refresh
 * - transaction history refresh
 * - order/job payment state
 * - notifications
 * - Orbit payment context
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";

// Map commerce:payment_* events to canonical downstream events
const COMMERCE_PAYMENT_BRIDGE: Record<string, { walletEvent: string; notifType: string }> = {
  "commerce:intent_prepared": {
    walletEvent: "wallet.updated",
    notifType: "payment_intent_prepared",
  },
  "commerce:payment_authorized": {
    walletEvent: "wallet.updated",
    notifType: "payment_authorized",
  },
  "commerce:payment_captured": {
    walletEvent: "wallet.updated",
    notifType: "payment_captured",
  },
  "commerce:payment_settled": {
    walletEvent: "wallet.updated",
    notifType: "payment_settled",
  },
  "commerce:payment_reversed": {
    walletEvent: "wallet.updated",
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

    // 1. Wallet balance refresh
    void eventBus.emit(targets.walletEvent, {
      orderId,
      stage,
      _bridgedFrom: commerceEvent,
    });

    // 2. Order/job payment state update
    void eventBus.emit("order.payment.updated", {
      orderId,
      stage,
      paymentEvent: commerceEvent,
    });

    // 3. Orbit payment context — thread update for order-linked conversations
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

console.log("[commerce-payment-bridge] Commerce payment bridge registered");
