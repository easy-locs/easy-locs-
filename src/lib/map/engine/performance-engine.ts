/**
 * PerformanceEngine — Throttle, batch, cull for map rendering performance.
 * Ensures smooth 60fps even with 1000+ elements.
 */

type PendingUpdate = { sourceId: string; data: any; timestamp: number };

const pendingUpdates = new Map<string, PendingUpdate>();
let rafId: number | null = null;
const MIN_UPDATE_INTERVAL_MS = 50; // max 20 updates/sec per source
const lastUpdateTime = new Map<string, number>();

/** Queue a source data update — batched via RAF */
export function queueSourceUpdate(sourceId: string, data: any) {
  pendingUpdates.set(sourceId, { sourceId, data, timestamp: Date.now() });
  scheduleFlush();
}

function scheduleFlush() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(flushUpdates);
}

function flushUpdates() {
  rafId = null;
  const now = Date.now();

  for (const [sourceId, update] of pendingUpdates) {
    const lastTime = lastUpdateTime.get(sourceId) || 0;
    if (now - lastTime < MIN_UPDATE_INTERVAL_MS) continue;

    // Apply update
    try {
      const mapInstance = (globalThis as any).__superMapInstance as mapboxgl.Map | undefined;
      if (mapInstance) {
        const src = mapInstance.getSource(sourceId) as any;
        if (src?.setData) src.setData(update.data);
      }
    } catch {}

    lastUpdateTime.set(sourceId, now);
    pendingUpdates.delete(sourceId);
  }

  // Re-schedule if still pending
  if (pendingUpdates.size > 0) scheduleFlush();
}

import type mapboxgl from "mapbox-gl";

/** Viewport culling — filter features to only those in current bounds + buffer */
export function cullFeaturesToViewport(
  features: GeoJSON.Feature[],
  bounds: mapboxgl.LngLatBounds,
  bufferDeg = 0.05
): GeoJSON.Feature[] {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const minLng = sw.lng - bufferDeg;
  const maxLng = ne.lng + bufferDeg;
  const minLat = sw.lat - bufferDeg;
  const maxLat = ne.lat + bufferDeg;

  return features.filter((f) => {
    if (f.geometry.type !== "Point") return true;
    const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  });
}

/** Throttle realtime updates per channel */
const channelThrottles = new Map<string, number>();

export function shouldThrottleRealtimeUpdate(channel: string, minIntervalMs = 200): boolean {
  const now = Date.now();
  const last = channelThrottles.get(channel) || 0;
  if (now - last < minIntervalMs) return true;
  channelThrottles.set(channel, now);
  return false;
}

/** Cleanup */
export function destroyPerformanceEngine() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  pendingUpdates.clear();
  lastUpdateTime.clear();
  channelThrottles.clear();
}
