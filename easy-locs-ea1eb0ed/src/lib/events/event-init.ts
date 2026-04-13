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
import { installReverseNotationBridge } from "@/lib/shared/notation-bridge";
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
import { installIntentBridge } from "@/lib/intent/intent-event-bridge";
import { populateSearchIndex } from "@/lib/intent/search-index-populator";
import "@/lib/radar/signal-ingestor";

/**
 * Bridge: forward platformBus (colon-notation) events to core eventBus (dot-notation).
 * Keys = platformBus event types (colon notation, e.g. "wallet:transaction_created").
 * Values = core eventBus target events (dot notation, e.g. "wallet.balance.refresh").
 * The dot-notation values are NOT platformBus events — they are eventBus events.
 * 
 * V3 CHANGE: Wallet events are now split into distinct downstream events.
 * "wallet.updated" is emitted as a LEGACY COMPAT alias alongside the specific event.
 */
const BRIDGE_MAP: Record<string, string[]> = {
  "wallet:transaction_created":   ["wallet.balance.refresh", "wallet.updated"],
  "wallet:payment_success":       ["wallet.balance.refresh", "wallet.payment.success", "wallet.updated"],
  "wallet:payment_failed":        ["wallet.payment.failed"],
  "wallet:payment_completed":     ["wallet.balance.refresh", "wallet.updated"],
  "wallet:transfer_completed":    ["wallet.balance.refresh", "wallet.updated"],
  "wallet:balance_updated":       ["wallet.balance.refresh", "wallet.updated"],
  "wallet:top_up":                ["wallet.balance.refresh"],
  "wallet:loaded":                ["wallet.balance.refresh"],
  "payment:intent_created":       ["payment.intent.created"],
  "property:unit_created":        ["listing.created"],
  "delivery:dispatched":          ["delivery.dispatched"],
  "delivery:completed":           ["delivery.completed"],
  "delivery:failed":              ["delivery.failed"],
  "delivery:driver_assigned":     ["delivery.driver_assigned"],
  "order:status_changed":         ["order.status_changed"],
  "message:sent":                 ["message.sent"],
  "conversation:created":         ["conversation.created"],
  "orbit:message_sent":           ["message.sent"],
  "orbit:message_received":       ["message.received"],
  "orbit:call_started":           ["call.started"],
  "orbit:call_ended":             ["call.ended"],
  "booking:requested":            ["order.created"],
  "booking:confirmed":            ["order.confirmed"],
  "booking:completed":            ["order.completed"],
  "booking:cancelled":            ["order.cancelled"],
  "booking:confirmation_required": ["order.confirmation_required"],
  "booking:payment_required":     ["order.payment_required"],
  "booking:created":              ["order.created"],
  "radar:location_shared":        ["location.shared"],
  "radar:pin_selected":           ["entity.click"],
  "marketplace:contact_opened":   ["contact.opened"],
  "marketplace:provider_went_live": ["entity.published"],
  "dashboard:refresh":            ["dashboard.refresh"],
  "ORDER_CREATED":                ["order.created"],
  "ORDER_COMPLETED":              ["order.completed"],
  "ORDER_DELIVERED":              ["order.completed"],
  "ORDER_CONFIRMED":              ["order.confirmed"],
  "ORDER_READY":                  ["order.ready"],
  "PAYMENT_SUCCESS":              ["wallet.balance.refresh", "wallet.updated"],
  "qr:payment_completed":         ["wallet.balance.refresh", "wallet.updated"],
  "ENTITY_OPENED":                ["entity.click"],
  "ENTITY_CLASSIFIED":            ["entity.classified"],
  "FOOD_MENU_NORMALIZED":         ["entity.normalized"],
  "HOTEL_INVENTORY_NORMALIZED":   ["entity.normalized"],
  "SERVICE_CATALOG_NORMALIZED":   ["entity.normalized"],
  "GROCERY_CATALOG_NORMALIZED":   ["entity.normalized"],
  "PUBLISH_GATE_PASSED":          ["entity.published"],
  "PUBLISH_GATE_BLOCKED":         ["entity.blocked"],
  "DELIVERY_COMPLETED":           ["delivery.completed"],
  "call:started":                 ["call.started"],
  "call:ended":                   ["call.ended"],
  "listing:created":              ["listing.created"],
  "listing:published":            ["listing.published"],
  "listing:updated":              ["listing.updated"],
  "ride:requested":               ["ride.requested"],
  "ride:driver_assigned":         ["ride.driver.assigned"],
  "ride:completed":               ["ride.completed"],
  "ride:cancelled":               ["ride.cancelled"],
  "radar:scan_completed":         ["radar.scan.completed"],
  "radar:filter_changed":         ["radar.filter.changed"],
  "map:route_focus":              ["map.route.focus"],
  "map:center_request":           ["map.center.request"],
  "map:order_requested":          ["place.order.requested"],
  "explore:section_viewed":       ["explore.section.viewed"],
  "explore:quick_action_clicked": ["explore.quick_action.clicked"],
  "explore:ai_suggestion_clicked":["explore.ai_suggestion.clicked"],
  "explore:continue_clicked":     ["explore.continue.clicked"],
  "explore:entity_clicked":       ["entity.click"],
  "explore:search_executed":      ["search.executed"],
  "dashboard:sections_refreshed": ["dashboard.refresh"],
  "mission:accepted":             ["mission.accepted"],
  "mission:completed":            ["mission.completed"],
  "storefront:order_paid":        ["order.status.updated"],
};

// Register bridge listeners
// Guard: skip payloads that were already bridged (from notation-bridge reverse path) to prevent loops
for (const [platformEvent, coreEvents] of Object.entries(BRIDGE_MAP)) {
  platformBus.on(platformEvent, (event) => {
    if ((event.payload as Record<string, unknown>)?.__bridged) return;
    const payload = {
      ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}),
      userId: event.userId,
      __bridged: true,
      _bridgedFrom: platformEvent,
    } as Record<string, any>;
    for (const coreEvent of coreEvents) {
      void eventBus.emit(coreEvent, payload);
    }
  });
}

// ── payment: → commerce: Compatibility Bridge ──
// The platform has two payment-related namespaces:
//   - "payment:*"  → generic payment events (e.g. payment:success, payment:failed)
//   - "commerce:*" → granular payment lifecycle events (intent_prepared, authorized, settled, reversed)
// This bridge ensures that code emitting generic "payment:success" also activates the
// commerce-payment-bridge handler, so order status updates and notifications fire correctly.
// commerce-payment-bridge.handler.ts is the authoritative listener for "commerce:*" events.
platformBus.on("payment:success", (event) => {
  const payload = { ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}), _bridgedFrom: "payment:success" } as Record<string, any>;
  platformBus.emit("commerce:payment_settled", payload, event.source ?? "system");
});
platformBus.on("payment:failed", (event) => {
  const payload = { ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}), _bridgedFrom: "payment:failed" } as Record<string, any>;
  platformBus.emit("commerce:payment_reversed", payload, event.source ?? "system");
});

// Initialize ride lifecycle handler (global realtime listener)
initRideLifecycleHandler();
initRideAIDispatchHandler();
initRidePostflowHandler();
initRideRatingHandler();
initSupportOpenHandler();
initUnifiedMobilityRequestHandler();
initMobilityCompatBridgeHandler();
initCloseFlowEngine();

// ── Intent Engine + Central Router ──
installIntentBridge();
populateSearchIndex();

// ── Data Quality Audit ──
import("@/lib/data-quality/audit-runner").then(({ runFullAudit }) => {
  runFullAudit();
});

// ── Intelligence Layer (AI Ranking + Recommendation + Feed + Validation) ──
import("@/lib/intelligence/intelligence-boot").then(({ bootIntelligenceLayer }) => {
  bootIntelligenceLayer();
});

// ── Command Bus Registration ──
import("@/domains/orbit/services/command-init");

// ── System Lock Guard — master runtime orchestrator ──
import("@/lib/runtime/system-lock-guard").then(({ initSystemLock }) => {
  initSystemLock();
});

// ── Reverse notation bridge: eventBus (dot) → platformBus (colon) ──
installReverseNotationBridge();

if (import.meta.env.DEV) console.log("[event-init] V4 — All handlers registered + wallet events SPLIT + bidirectional notation bridge active + commandBus wired");
