/**
 * geo-event-bridge — Atomic unit: emit canonical geo events on location changes.
 * Single responsibility: bridge geo state changes to platform bus.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { trackPropagation } from "@/lib/runtime/propagation-validator";
import { APP_EVENTS } from "@/lib/platform/events";

export function emitGeoUpdated(payload: {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  source: "gps" | "ip" | "manual" | "search";
}) {
  platformBus.emit(APP_EVENTS.RADAR_GEO_UPDATED, payload, "geo");

  reportHealth("geo", "ok");

  trackPropagation({
    flowId: `geo-update-${Date.now()}`,
    domain: "geo",
    action: "location_updated",
    dbWriteSuccess: false,
    eventEmitted: APP_EVENTS.RADAR_GEO_UPDATED,
    cacheInvalidated: ["geo-context", "nearby-merchants", "delivery-zones"],
  });
}

export function emitGeoError(error: string) {
  reportHealth("geo", "degraded", undefined, error);
}
