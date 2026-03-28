/**
 * order-cache-invalidator — Atomic: invalidate order-related TanStack caches on events.
 */
import { platformBus } from "@/lib/shared/platform-bus";

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
    platformBus.on("ORDER_CREATED", () => invalidateOrderCaches()),
    platformBus.on("ORDER_CONFIRMED", () => invalidateOrderCaches()),
    platformBus.on("ORDER_READY", () => invalidateOrderCaches()),
    platformBus.on("ORDER_DELIVERED", () => invalidateOrderCaches()),
    platformBus.on("PAYMENT_SUCCESS", () => invalidateOrderCaches()),
    platformBus.on("REFUND_REQUESTED", () => invalidateOrderCaches()),
    platformBus.on("MISSION_ACCEPTED", () => invalidateOrderCaches()),
    platformBus.on("MISSION_COMPLETED", () => invalidateOrderCaches()),
    platformBus.on("storefront:order_placed" as any, () => invalidateOrderCaches()),
    platformBus.on("storefront:order_completed" as any, () => invalidateOrderCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
