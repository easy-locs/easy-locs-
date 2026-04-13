/**
 * order-cache-invalidator — Atomic: invalidate order-related TanStack caches.
 * Uses canonical APP_EVENTS.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

let queryClientRef: any = null;

const ORDER_QUERY_KEYS = [
  "orders", "my-orders", "order-detail", "merchant-orders",
  "active-orders", "order-status", "order-history",
] as const;

export function registerOrderQueryClient(qc: any) {
  queryClientRef = qc;
}

export function invalidateOrderCaches() {
  if (!queryClientRef) return;
  for (const key of ORDER_QUERY_KEYS) {
    queryClientRef.invalidateQueries({ queryKey: [key] });
  }
}

export function installOrderCacheListener(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.ORDER_CREATED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.ORDER_CONFIRMED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.ORDER_READY, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.ORDER_COMPLETED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.ORDER_CANCELLED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.ORDER_REFUNDED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.PAYMENT_SUCCESS, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.MISSION_ACCEPTED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.MISSION_COMPLETED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_PLACED, () => invalidateOrderCaches()),
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_COMPLETED, () => invalidateOrderCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
