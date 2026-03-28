/**
 * seasonal-cache-invalidator — Cache sync for seasonal/stays domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { queryClient } from "@/lib/query-client";

const SEASONAL_QUERY_KEYS = [
  "seasonal-bookings", "seasonal-listings", "seasonal-calendar",
  "booking-requests", "ical-feeds", "stay-bookings",
] as const;

export function invalidateSeasonalCaches() {
  for (const key of SEASONAL_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function installSeasonalCacheListeners(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.SEASONAL_BOOKING_CREATED as any, () => invalidateSeasonalCaches()),
    platformBus.on(APP_EVENTS.SEASONAL_BOOKING_UPDATED as any, () => invalidateSeasonalCaches()),
    platformBus.on(APP_EVENTS.SEASONAL_BOOKING_CANCELLED as any, () => invalidateSeasonalCaches()),
    platformBus.on(APP_EVENTS.SEASONAL_ICAL_SYNCED as any, () => invalidateSeasonalCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
