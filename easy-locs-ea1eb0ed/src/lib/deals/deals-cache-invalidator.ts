/**
 * deals-cache-invalidator — Cache sync for deals/negotiation domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { queryClient } from "@/lib/query-client";

const DEAL_QUERY_KEYS = [
  "deals", "deal-detail", "deal-offers", "deal-documents",
] as const;

export function invalidateDealCaches() {
  for (const key of DEAL_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function installDealCacheListeners(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.DEAL_CREATED, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_OFFER_SENT, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_COUNTER_OFFER, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_ACCEPTED, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_CANCELLED, () => invalidateDealCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
