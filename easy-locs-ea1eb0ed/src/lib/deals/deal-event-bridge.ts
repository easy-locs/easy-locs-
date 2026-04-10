/**
 * deal-event-bridge — Canonical events for deal room mutations.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

export function emitDealStatusChanged(dealId: string, status: string) {
  platformBus.emit("deal:status_changed", { dealId, status }, "deals");
  platformBus.emit("dashboard:counters_refresh", {}, "deals");
  platformBus.emit("notifications:refresh", {}, "deals");
  trackPropagation({
    flowId: `deal-status-${dealId}-${status}`,
    domain: "deals",
    action: "status_changed",
    dbWriteSuccess: true,
    eventEmitted: "deal:status_changed",
    cacheInvalidated: ["deals", "deal-timeline"],
  });
}

export function emitDealOfferSent(dealId: string) {
  platformBus.emit("deal:offer_sent", { dealId }, "deals");
  platformBus.emit("notifications:refresh", {}, "deals");
  trackPropagation({
    flowId: `deal-offer-${dealId}`,
    domain: "deals",
    action: "offer_sent",
    dbWriteSuccess: true,
    eventEmitted: "deal:offer_sent",
    cacheInvalidated: ["deals", "deal-timeline"],
  });
}

export function emitDealCompleted(dealId: string) {
  platformBus.emit("deal:completed", { dealId }, "deals");
  platformBus.emit("wallet:balance_updated", {}, "deals");
  platformBus.emit("dashboard:counters_refresh", {}, "deals");
  trackPropagation({
    flowId: `deal-completed-${dealId}`,
    domain: "deals",
    action: "completed",
    dbWriteSuccess: true,
    eventEmitted: "deal:completed",
    cacheInvalidated: ["deals", "wallet-balance", "dashboard-kpi"],
  });
}
