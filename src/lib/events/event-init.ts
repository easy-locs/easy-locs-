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
import "./handlers/eta-refresh.handler";
import "./handlers/merchant-visibility-refresh.handler";
import "./handlers/commerce-payment-bridge.handler";
import "./handlers/zone-intelligence.handler";
import "./handlers/experience-consumer.handler";
import "./handlers/map-action.handler";
import "./handlers/ride-bridge.handler";
import { initRideLifecycleHandler } from "./handlers/ride-lifecycle.handler";
import "@/lib/radar/signal-ingestor";

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
  "booking.confirmation.required": "order.confirmation_required",
  "booking.payment.required": "order.payment_required",
  // Storefront orchestration
  "ORDER_CREATED": "order.created",
  "ORDER_COMPLETED": "order.completed",
  "ORDER_DELIVERED": "order.completed",
  "ORDER_CONFIRMED": "order.confirmed",
  "ORDER_READY": "order.ready",
  "PAYMENT_SUCCESS": "wallet.updated",
  // QR
  "qr.payment.completed": "wallet.updated",
  // Radar entity open → entity.click
  "ENTITY_OPENED": "entity.click",
  // Vertical pipeline events → passthrough
  "ENTITY_CLASSIFIED": "entity.classified",
  "FOOD_MENU_NORMALIZED": "entity.normalized",
  "HOTEL_INVENTORY_NORMALIZED": "entity.normalized",
  "SERVICE_CATALOG_NORMALIZED": "entity.normalized",
  "GROCERY_CATALOG_NORMALIZED": "entity.normalized",
  "PUBLISH_GATE_PASSED": "entity.published",
  "PUBLISH_GATE_BLOCKED": "entity.blocked",
  "DELIVERY_COMPLETED": "delivery.completed",
  // Calls
  "call.started": "call.started",
  "call.ended": "call.ended",
  // Listings
  "listing.created": "listing.created",
  "listing.published": "listing.published",
  "listing.updated": "listing.updated",
  // Ride lifecycle
  "ride.requested": "ride.requested",
  "ride.driver.assigned": "ride.driver.assigned",
  "ride.completed": "ride.completed",
  "ride.cancelled": "ride.cancelled",
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

// Initialize ride lifecycle handler (global realtime listener)
initRideLifecycleHandler();

console.log("[event-init] All event handlers registered + platformBus bridge active");