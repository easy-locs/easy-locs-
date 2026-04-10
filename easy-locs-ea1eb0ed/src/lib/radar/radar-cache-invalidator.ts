/**
 * radar-cache-invalidator — Cache sync for radar/geo/map domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { queryClient } from "@/lib/query-client";

const RADAR_QUERY_KEYS = [
  "radar-entities", "radar-layers", "geo-context",
  "rider-presence", "merchant-presence", "live-map",
] as const;

export function invalidateRadarCaches() {
  for (const key of RADAR_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function installRadarCacheListeners(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.RADAR_GEO_UPDATED as any, () => invalidateRadarCaches()),
    platformBus.on(APP_EVENTS.RADAR_VIEW_CHANGED as any, () => invalidateRadarCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_DRIVER_ASSIGNED as any, () => invalidateRadarCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_COMPLETED as any, () => invalidateRadarCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
