/**
 * rental-cache-invalidator — Invalidates all rental-related react-query caches.
 * Listens to canonical APP_EVENTS.
 */
import { queryClient } from "@/lib/query-client";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

const RENTAL_QUERY_KEYS = [
  "rental-properties", "rental-tenants", "rental-leases",
  "rental-rent-calls", "rental-documents", "rental-inventory",
  "rental-expenses",
] as const;

export function invalidateRentalCaches() {
  for (const key of RENTAL_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function installRentalCacheListeners(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.RENTAL_PROPERTY_CREATED as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_PROPERTY_UPDATED as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_TENANT_CREATED as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_TENANT_UPDATED as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_CREATED as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_PAID as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_RECEIPT_GENERATED as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_LEASE_GENERATED as any, () => invalidateRentalCaches()),
    platformBus.on(APP_EVENTS.RENTAL_MESSAGE_SENT as any, () => invalidateRentalCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
