/**
 * delivery-cache-invalidator — Atomic unit: invalidate delivery caches on events.
 * Uses canonical APP_EVENTS.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

let queryClientRef: any = null;

const DELIVERY_QUERY_KEYS = [
  "delivery-jobs", "active-deliveries", "mobility-jobs", "driver-presence",
] as const;

export function registerDeliveryQueryClient(qc: any) {
  queryClientRef = qc;
}

export function invalidateDeliveryCaches() {
  if (!queryClientRef) return;
  for (const key of DELIVERY_QUERY_KEYS) {
    queryClientRef.invalidateQueries({ queryKey: [key] });
  }
}

export function installDeliveryCacheListener(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.DELIVERY_DISPATCHED as any, () => invalidateDeliveryCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_COMPLETED as any, () => invalidateDeliveryCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_FAILED as any, () => invalidateDeliveryCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_DRIVER_ASSIGNED as any, () => invalidateDeliveryCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_PICKUP as any, () => invalidateDeliveryCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_DELIVERING as any, () => invalidateDeliveryCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
