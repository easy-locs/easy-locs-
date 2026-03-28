/**
 * geo-dispatcher — Propagates canonical geo updates to all consumers.
 * Single writer → many readers pattern via platformBus.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import type { CanonicalGeoEntity } from "@/lib/domains/canonical-entities";

export interface GeoUpdate {
  geo: CanonicalGeoEntity;
  trigger: "gps" | "manual" | "import" | "search" | "fallback";
  timestamp: number;
}

/** Dispatch a geo update to all platform consumers */
export function dispatchGeoUpdate(geo: CanonicalGeoEntity, trigger: GeoUpdate["trigger"]) {
  const update: GeoUpdate = { geo, trigger, timestamp: Date.now() };
  platformBus.emit("geo:canonical_updated", update, "geo-dispatcher");
}

/** Subscribe to canonical geo updates */
export function onGeoUpdate(handler: (update: GeoUpdate) => void): () => void {
  return platformBus.on("geo:canonical_updated", handler);
}

/** Dispatch user position specifically (for map/radar centering) */
export function dispatchUserPosition(lat: number, lng: number, source: string) {
  platformBus.emit("geo:user_position", { lat, lng, source, timestamp: Date.now() }, "geo-dispatcher");
}

/** Subscribe to user position updates */
export function onUserPosition(handler: (pos: { lat: number; lng: number; source: string }) => void): () => void {
  return platformBus.on("geo:user_position", handler);
}
