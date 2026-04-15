/**
 * P0 Bridge — commerce:payment_* events
 * 
 * V4: Uses unified platformBus with colon-notation only.
 * Each commerce stage maps to its own canonical event.
 */
import { platformBus } from "@/lib/shared/platform-bus";

const COMMERCE_PAYMENT_BRIDGE: Record<string, { walletEvents: string[]; notifType: string }> = {
  "commerce:intent_prepared": {
    walletEvents: ["commerce:intent_prepared_downstream", "wallet:balance_refresh"],
    notifType: "payment_intent_prepared",
  },
  "commerce:payment_authorized": {
    walletEvents: ["commerce:payment_authorized_downstream", "wallet:balance_refresh"],
    notifType: "payment_authorized",
  },
  "commerce:payment_captured": {
    walletEvents: ["commerce:payment_captured_downstream", "wallet:balance_refresh"],
    notifType: "payment_captured",
  },
  "commerce:payment_settled": {
    walletEvents: ["commerce:payment_settled_downstream", "wallet:balance_refresh"],
    notifType: "payment_settled",
  },
  "commerce:payment_reversed": {
    walletEvents: ["commerce:payment_reversed_downstream", "wallet:balance_refresh"],
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

    if (import.meta.env.DEV) console.log(`[commerce-payment-bridge] ${commerceEvent} → propagating (order: ${orderId}, stage: ${stage})`);

    for (const walletEvent of targets.walletEvents) {
      platformBus.emit(walletEvent, {
        orderId,
        stage,
        _routedFrom: commerceEvent,
      }, event.source ?? "system");
    }

    platformBus.emit("order:payment_updated", {
      orderId,
      stage,
      paymentEvent: commerceEvent,
    }, event.source ?? "system");

    platformBus.emit("orbit:payment_context", {
      orderId,
      stage,
      notifType: targets.notifType,
    }, event.source ?? "system");

    platformBus.emit("notification:payment", {
      orderId,
      stage,
      type: targets.notifType,
    }, event.source ?? "system");
  });
}

if (import.meta.env.DEV) console.log("[commerce-payment-bridge] V4 — Commerce payment bridge registered (unified bus)");
