/**
 * Event Init — Centralised event routing on the unified platformBus.
 *
 * Task #123: The dual-bus architecture (eventBus + platformBus) has been removed.
 * All events flow through platformBus with colon-notation only.
 *
 * The ROUTING_MAP below replaces the old BRIDGE_MAP: it re-emits platformBus events
 * under additional colon-notation aliases so that downstream listeners can subscribe
 * to a single canonical name regardless of which upstream event fired.
 */
import { platformBus } from "@/lib/shared/platform-bus";
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
import "./handlers/radar-merchant-status.handler";
import "./handlers/brand-success-flash.handler";

const ROUTING_MAP: Record<string, string[]> = {
  "wallet:transaction_created":     ["wallet:balance_refresh", "wallet:updated"],
  "wallet:payment_success":         ["wallet:balance_refresh", "wallet:updated"],
  "wallet:payment_completed":       ["wallet:balance_refresh", "wallet:updated"],
  "wallet:transfer_completed":      ["wallet:balance_refresh", "wallet:updated"],
  "wallet:balance_updated":         ["wallet:balance_refresh", "wallet:updated"],
  "wallet:top_up":                  ["wallet:balance_refresh"],
  "wallet:loaded":                  ["wallet:balance_refresh"],
  "qr:payment_completed":           ["wallet:balance_refresh", "wallet:updated"],
  "booking:confirmed":              ["order:confirmed"],
  "booking:completed":              ["order:completed"],
  "booking:cancelled":              ["order:cancelled"],
  "booking:created":                ["order:created"],
  "radar:pin_selected":             ["entity:click"],
  "marketplace:provider_went_live": ["entity:published"],
  "explore:entity_clicked":         ["entity:click"],
  "explore:search_executed":        ["search:executed"],
  "storefront:order_paid":          ["order:status_updated"],

  // Legacy UPPER_CASE pipeline events — emitted by engines, order actions, and
  // delivery handlers. Kept for backward compatibility until all emitters migrate
  // to colon-notation equivalents.
  "ORDER_CREATED":                  ["order:created"],
  "ORDER_COMPLETED":                ["order:completed"],
  "ORDER_DELIVERED":                ["order:completed"],
  "ORDER_CONFIRMED":                ["order:confirmed"],
  "ORDER_READY":                    ["order:ready"],
  "ENTITY_OPENED":                  ["entity:click"],
  "ENTITY_CLASSIFIED":              ["entity:classified"],
  "FOOD_MENU_NORMALIZED":           ["entity:normalized"],
  "HOTEL_INVENTORY_NORMALIZED":     ["entity:normalized"],
  "SERVICE_CATALOG_NORMALIZED":     ["entity:normalized"],
  "GROCERY_CATALOG_NORMALIZED":     ["entity:normalized"],
  "PUBLISH_GATE_PASSED":            ["entity:published"],
  "PUBLISH_GATE_BLOCKED":           ["entity:blocked"],
};

for (const [sourceEvent, targets] of Object.entries(ROUTING_MAP)) {
  if (targets.length === 0) continue;
  platformBus.on(sourceEvent, (event) => {
    const payload = typeof event.payload === "object" && event.payload !== null ? event.payload : {};
    for (const target of targets) {
      platformBus.emit(target, { ...payload as Record<string, unknown>, _routedFrom: sourceEvent }, event.source ?? "system");
    }
  });
}

platformBus.on("payment:success", (event) => {
  if ((event.payload as Record<string, unknown>)?._bridgedFrom === "wallet:payment_success") return;
  const payload = { ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}), _bridgedFrom: "payment:success" } as Record<string, any>;
  platformBus.emit("commerce:payment_settled", payload, event.source ?? "system");
  platformBus.emit("wallet:payment_success", { ...payload, _bridgedFrom: "payment:success" }, event.source ?? "system");
});
platformBus.on("payment:failed", (event) => {
  const payload = { ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}), _bridgedFrom: "payment:failed" } as Record<string, any>;
  platformBus.emit("commerce:payment_reversed", payload, event.source ?? "system");
});

initRideLifecycleHandler();
initRideAIDispatchHandler();
initRidePostflowHandler();
initRideRatingHandler();
initSupportOpenHandler();
initUnifiedMobilityRequestHandler();
initMobilityCompatBridgeHandler();
initCloseFlowEngine();

installIntentBridge();
populateSearchIndex();

import("@/lib/data-quality/audit-runner").then(({ runFullAudit }) => {
  runFullAudit();
});

import("@/lib/c2c/listing-lifecycle").then(() => {
  import("@/services/db").then(({ db }) => {
    db.auth.getSession().then(({ data }) => {
      const userId = data?.session?.user?.id;
      if (!userId) return;
      import("@/lib/c2c/listing-lifecycle").then(({ checkExpiringListings, archiveExpiredListings }) => {
        checkExpiringListings(userId).catch(() => {});
        archiveExpiredListings(userId).catch(() => {});
      });
    });
  });
}).catch(() => {});

import("@/lib/intelligence/intelligence-boot").then(({ bootIntelligenceLayer }) => {
  bootIntelligenceLayer();
});

import("@/domains/orbit/services/command-init");

import("@/lib/runtime/system-lock-guard").then(({ initSystemLock }) => {
  initSystemLock();
});

import("@/lib/events/validate-p0-bridges").then(({ validateP0Bridges }) => {
  setTimeout(() => {
    validateP0Bridges().then(results => {
      const passed = results.filter(r => r.pass).length;
      console.log(`[P0-bridges] Validated ${results.length} bridges — ${passed} pass, ${results.length - passed} fail`);
    }).catch(() => {});
  }, 20_000);
});

import("@/lib/social/engagement-events").then(({ installEngagementListeners }) => {
  installEngagementListeners();
}).catch(() => {});

import("@/domains/restaurant/service").then(({ installFoodOrderReactions }) => {
  installFoodOrderReactions();
}).catch(() => {});

if (import.meta.env.DEV) console.log("[event-init] V5 — Unified bus (platformBus only, colon-notation)");
