/**
 * concierge-cache-invalidator — Cache sync for concierge/services domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { queryClient } from "@/lib/query-client";

const CONCIERGE_QUERY_KEYS = [
  "concierge-services", "concierge-bookings", "concierge-categories",
] as const;

export function invalidateConciergeCaches() {
  for (const key of CONCIERGE_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function installConciergeCacheListeners(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.CONCIERGE_SERVICE_BOOKED as any, () => invalidateConciergeCaches()),
    platformBus.on(APP_EVENTS.CONCIERGE_BOOKING_UPDATED as any, () => invalidateConciergeCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
