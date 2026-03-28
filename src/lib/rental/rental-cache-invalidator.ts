/**
 * rental-cache-invalidator — Invalidates all rental-related react-query caches.
 */
import { queryClient } from "@/lib/query-client";
import { platformBus } from "@/lib/shared/platform-bus";

const RENTAL_QUERY_KEYS = [
  "rental-properties",
  "rental-tenants",
  "rental-leases",
  "rental-rent-calls",
  "rental-documents",
  "rental-inventory",
  "rental-expenses",
];

export function invalidateRentalCaches() {
  RENTAL_QUERY_KEYS.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

export function installRentalCacheListeners(): () => void {
  const unsubs = [
    platformBus.on("rental:property_created" as any, () => invalidateRentalCaches()),
    platformBus.on("rental:tenant_created" as any, () => invalidateRentalCaches()),
    platformBus.on("rental:rent_call_created" as any, () => invalidateRentalCaches()),
    platformBus.on("rental:rent_call_paid" as any, () => invalidateRentalCaches()),
  ];
  return () => unsubs.forEach((u) => u());
}
