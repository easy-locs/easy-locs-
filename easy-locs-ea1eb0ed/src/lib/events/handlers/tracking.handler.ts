/**
 * Tracking handler — logs business events for analytics.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackEvent } from "@/lib/analytics/event-bus";

platformBus.on("order:created", (event) => {
  const p = event.payload as Record<string, any>;
  trackEvent({ type: "order.created", userId: p.userId, metadata: { orderId: p.orderId, shopId: p.shopId } });
});

platformBus.on("order:completed", (event) => {
  const p = event.payload as Record<string, any>;
  trackEvent({ type: "order.completed", userId: p.userId, metadata: { orderId: p.orderId, amount: p.amount } });
});

platformBus.on("boost:purchased", (event) => {
  const p = event.payload as Record<string, any>;
  trackEvent({ type: "boost.purchased", userId: p.userId, metadata: { shopId: p.shopId } });
});

platformBus.on("search:performed", (event) => {
  const p = event.payload as Record<string, any>;
  trackEvent({ type: "search.performed", metadata: { query: p.query } });
});

platformBus.on("entity:view", (event) => {
  const p = event.payload as Record<string, any>;
  trackEvent({ type: "entity.view", userId: p.userId, metadata: { entityId: p.entityId } });
});

platformBus.on("entity:click", (event) => {
  const p = event.payload as Record<string, any>;
  trackEvent({ type: "entity.click", userId: p.userId, metadata: { entityId: p.entityId } });
});
