/**
 * Event Init — bridges platformBus (real events from stores) → eventBus (handler consumers).
 * 
 * V3: wallet.updated SPLIT into distinct events:
 * - wallet.transaction.created → wallet.balance.refresh
 * - wallet.payment.success     → wallet.balance.refresh + order.payment.updated
 * - wallet.payment.failed      → wallet.payment.failed (distinct, not lossy)
 * - wallet.payment.completed   → wallet.balance.refresh
 * - PAYMENT_SUCCESS            → wallet.balance.refresh
 * - qr.payment.completed       → wallet.balance.refresh
 * 
 * The lossy "wallet.updated" is preserved ONLY as a backward-compat alias
 * for consumers not yet migrated. New consumers MUST use specific events.
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
import { initRideAIDispatchHandler } from "./handlers/ride-ai-dispatch.handler";
import { initRidePostflowHandler } from "./handlers/ride-postflow.handler";
import { initRideRatingHandler } from "./handlers/ride-rating.handler";
import { initSupportOpenHandler } from "./handlers/support-open.handler";
import { initUnifiedMobilityRequestHandler } from "./handlers/unified-mobility-request.handler";
import { initMobilityCompatBridgeHandler } from "./handlers/mobility-compat-bridge.handler";
import { initCloseFlowEngine } from "@/lib/close-flow/close-flow-engine";
import "@/lib/radar/signal-ingestor";

/**
 * Bridge: forward platformBus events to eventBus with normalized names.
 * 
 * V3 CHANGE: Wallet events are now split into distinct downstream events.
 * "wallet.updated" is emitted as a LEGACY COMPAT alias alongside the specific event.
 */
const BRIDGE_MAP: Record<string, string[]> = {
  // Wallet — SPLIT: each source gets specific + legacy compat
  "wallet.transaction.created": ["wallet.balance.refresh", "wallet.updated"],
  "wallet.payment.success":     ["wallet.balance.refresh", "wallet.payment.success", "wallet.updated"],
  "wallet.payment.failed":      ["wallet.payment.failed"],
  "wallet.payment.completed":   ["wallet.balance.refresh", "wallet.updated"],
  // Messaging
  "message.sent":               ["message.sent"],
  "conversation.created":       ["conversation.created"],
  // Orbit V2 cross-app
  "orbit.message.sent":         ["message.sent"],
  "orbit.message.received":     ["message.received"],
  "orbit.call.started":         ["call.started"],
  "orbit.call.ended":           ["call.ended"],
  // Booking → order-like events
  "booking.requested":          ["order.created"],
  "booking.confirmed":          ["order.confirmed"],
  "booking.completed":          ["order.completed"],
  "booking.cancelled":          ["order.cancelled"],
  "booking.confirmation.required": ["order.confirmation_required"],
  "booking.payment.required":   ["order.payment_required"],
  "booking.created":            ["order.created"],
  // Radar V2 cross-app
  "radar.location.shared":      ["location.shared"],
  "radar.pin.selected":         ["entity.click"],
  // Marketplace V2 cross-app
  "marketplace.contact.opened": ["contact.opened"],
  "marketplace.merchant.live":  ["entity.published"],
  // Dashboard V2 cross-app
  "dashboard.refresh":          ["dashboard.refresh"],
  // Storefront orchestration
  "ORDER_CREATED":              ["order.created"],
  "ORDER_COMPLETED":            ["order.completed"],
  "ORDER_DELIVERED":            ["order.completed"],
  "ORDER_CONFIRMED":            ["order.confirmed"],
  "ORDER_READY":                ["order.ready"],
  "PAYMENT_SUCCESS":            ["wallet.balance.refresh", "wallet.updated"],
  // QR
  "qr.payment.completed":       ["wallet.balance.refresh", "wallet.updated"],
  // Radar entity open
  "ENTITY_OPENED":              ["entity.click"],
  // Vertical pipeline
  "ENTITY_CLASSIFIED":          ["entity.classified"],
  "FOOD_MENU_NORMALIZED":       ["entity.normalized"],
  "HOTEL_INVENTORY_NORMALIZED": ["entity.normalized"],
  "SERVICE_CATALOG_NORMALIZED": ["entity.normalized"],
  "GROCERY_CATALOG_NORMALIZED": ["entity.normalized"],
  "PUBLISH_GATE_PASSED":        ["entity.published"],
  "PUBLISH_GATE_BLOCKED":       ["entity.blocked"],
  "DELIVERY_COMPLETED":         ["delivery.completed"],
  // Calls
  "call.started":               ["call.started"],
  "call.ended":                 ["call.ended"],
  // Listings
  "listing.created":            ["listing.created"],
  "listing.published":          ["listing.published"],
  "listing.updated":            ["listing.updated"],
  // Ride lifecycle
  "ride.requested":             ["ride.requested"],
  "ride.driver.assigned":       ["ride.driver.assigned"],
  "ride.completed":             ["ride.completed"],
  "ride.cancelled":             ["ride.cancelled"],
};

// Register bridge listeners
for (const [platformEvent, coreEvents] of Object.entries(BRIDGE_MAP)) {
  platformBus.on(platformEvent, (event) => {
    const payload = {
      ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}),
      userId: event.userId,
      _bridgedFrom: platformEvent,
    } as Record<string, any>;
    for (const coreEvent of coreEvents) {
      void eventBus.emit(coreEvent, payload);
    }
  });
}

// Initialize ride lifecycle handler (global realtime listener)
initRideLifecycleHandler();
initRideAIDispatchHandler();
initRidePostflowHandler();
initRideRatingHandler();
initSupportOpenHandler();
initUnifiedMobilityRequestHandler();
initMobilityCompatBridgeHandler();
initCloseFlowEngine();

console.log("[event-init] V3 — All handlers registered + wallet events SPLIT + platformBus bridge active");
