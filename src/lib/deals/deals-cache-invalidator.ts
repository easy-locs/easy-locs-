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
    platformBus.on(APP_EVENTS.DEAL_CREATED as any, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_OFFER_SENT as any, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_COUNTER_OFFER as any, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_ACCEPTED as any, () => invalidateDealCaches()),
    platformBus.on(APP_EVENTS.DEAL_CANCELLED as any, () => invalidateDealCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
