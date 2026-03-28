/**
 * delivery-cache-invalidator — Atomic unit: invalidate delivery caches on events.
 * Single responsibility: cache sync for delivery domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";

let queryClientRef: any = null;

const DELIVERY_QUERY_KEYS = [
  "delivery-jobs",
  "active-deliveries",
  "mobility-jobs",
  "driver-presence",
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
    platformBus.on("delivery:dispatched" as any, () => invalidateDeliveryCaches()),
    platformBus.on("delivery:completed" as any, () => invalidateDeliveryCaches()),
    platformBus.on("delivery:failed" as any, () => invalidateDeliveryCaches()),
    platformBus.on("delivery:driver_assigned" as any, () => invalidateDeliveryCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
