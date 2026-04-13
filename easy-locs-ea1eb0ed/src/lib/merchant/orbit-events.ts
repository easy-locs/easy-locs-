/**
 * Merchant-specific Orbit Event emitters.
 * Integrates with the platform-bus for cross-module communication.
 */
import { platformBus } from "@/lib/shared/platform-bus";

export function emitMerchantImported(merchantId: string, name: string) {
  platformBus.emit("marketplace:listing_published", { merchantId, name, action: "imported" }, "marketplace");
}

export function emitMerchantClaimed(merchantId: string, userId: string) {
  platformBus.emit("marketplace:booking_confirmed", { merchantId, userId, action: "claimed" }, "marketplace");
}

export function emitMerchantActivated(merchantId: string, userId: string) {
  platformBus.emit("marketplace:provider_went_live", { merchantId, userId, action: "activated" }, "marketplace");
}

export function emitMenuUpdated(merchantId: string, itemCount: number) {
  platformBus.emit("storefront:cart_updated", { merchantId, itemCount, action: "menu_updated" }, "marketplace");
}

export function emitOutreachSent(merchantId: string, channel: string) {
  platformBus.emit("orbit:message_sent", { merchantId, channel, action: "outreach_sent" }, "orbit");
}

export function emitOrderCreated(orderId: string, merchantId: string, amount: number) {
  platformBus.emit("storefront:order_placed", { orderId, merchantId, amount }, "marketplace");
}

export function emitPaymentCompleted(orderId: string, amount: number) {
  platformBus.emit("wallet:payment_completed", { orderId, amount }, "wallet");
}

export function emitDriverAssigned(orderId: string, driverId: string) {
  platformBus.emit("tracking:started", { orderId, driverId }, "tracking");
}

// Wallet commerce events — use canonical commerce: namespace so commerce-payment-bridge.handler
// can update order status and trigger proper notifications per payment stage.
export function emitWalletIntentPrepared(orderId: string, amount: number) {
  platformBus.emit("commerce:intent_prepared", { orderId, amount, stage: "intent_prepared" }, "wallet");
}

export function emitWalletAuthorized(orderId: string, amount: number) {
  platformBus.emit("commerce:payment_authorized", { orderId, amount, stage: "authorized" }, "wallet");
}

export function emitWalletCaptured(orderId: string) {
  platformBus.emit("commerce:payment_captured", { orderId, stage: "captured" }, "wallet");
}

export function emitWalletSettled(orderId: string) {
  platformBus.emit("commerce:payment_settled", { orderId, stage: "settled" }, "wallet");
}

export function emitWalletReversed(orderId: string) {
  platformBus.emit("commerce:payment_reversed", { orderId, stage: "reversed" }, "wallet");
}

export function emitOrderValidated(orderId: string) {
  platformBus.emit("storefront:order_placed", { orderId, action: "validated" }, "marketplace");
}
