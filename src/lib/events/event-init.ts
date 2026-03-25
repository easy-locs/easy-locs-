/**
 * Event Init — bridges platformBus (real events from stores) → eventBus (handler consumers).
 * Also imports all handler registrations.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import "./handlers/notification.handler";
import "./handlers/tracking.handler";
import "./handlers/ai-feedback.handler";
import "./handlers/business.handler";
import "./handlers/user-behavior.handler";

/**
 * Bridge: forward platformBus events to eventBus with normalized names.
 * This connects real store events (wallet.transaction.created, message.sent, etc.)
 * to the handler layer that listens on eventBus.
 */
const BRIDGE_MAP: Record<string, string> = {
  // Wallet
  "wallet.transaction.created": "wallet.updated",
  "wallet.payment.success": "wallet.updated",
  "wallet.payment.failed": "wallet.updated",
  // Messaging
  "message.sent": "message.sent",
  "conversation.created": "conversation.created",
  // Booking → order-like events
  "booking.requested": "order.created",
  "booking.confirmed": "order.confirmed",
  "booking.completed": "order.completed",
  "booking.cancelled": "order.cancelled",
  // Storefront orchestration
  "ORDER_CREATED": "order.created",
  "ORDER_COMPLETED": "order.completed",
  "ORDER_DELIVERED": "order.completed",
  "PAYMENT_SUCCESS": "wallet.updated",
  // QR
  "qr.payment.completed": "wallet.updated",
  // Radar entity open → entity.click
  "ENTITY_OPENED": "entity.click",
};

// Register bridge listeners
for (const [platformEvent, coreEvent] of Object.entries(BRIDGE_MAP)) {
  platformBus.on(platformEvent, (event) => {
    const payload = {
      ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}),
      userId: event.userId,
      _bridgedFrom: platformEvent,
    } as Record<string, any>;
    void eventBus.emit(coreEvent, payload);
  });
}

console.log("[event-init] All event handlers registered + platformBus bridge active");