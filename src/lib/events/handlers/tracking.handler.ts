/**
 * Tracking handler — logs business events for analytics.
 */
import { eventBus } from "@/lib/core/event-bus";
import { trackEvent } from "@/lib/analytics/event-bus";

eventBus.on("order.created", (p) => {
  trackEvent({ type: "order.created", userId: p.userId, metadata: { orderId: p.orderId, shopId: p.shopId } });
});

eventBus.on("order.completed", (p) => {
  trackEvent({ type: "order.completed", userId: p.userId, metadata: { orderId: p.orderId, amount: p.amount } });
});

eventBus.on("boost.purchased", (p) => {
  trackEvent({ type: "boost.purchased", userId: p.userId, metadata: { shopId: p.shopId } });
});

eventBus.on("search.performed", (p) => {
  trackEvent({ type: "search.performed", metadata: { query: p.query } });
});

eventBus.on("entity.view", (p) => {
  trackEvent({ type: "entity.view", userId: p.userId, metadata: { entityId: p.entityId } });
});

eventBus.on("entity.click", (p) => {
  trackEvent({ type: "entity.click", userId: p.userId, metadata: { entityId: p.entityId } });
});
