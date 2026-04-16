import type maplibregl from "maplibre-gl";
import { getMapInstance } from "@/hooks/map/useMapCore";

type PendingUpdate = { sourceId: string; data: GeoJSON.GeoJSON; timestamp: number };

const pendingUpdates = new Map<string, PendingUpdate>();
let rafId: number | null = null;
const MIN_UPDATE_INTERVAL_MS = 50;
const lastUpdateTime = new Map<string, number>();

export function queueSourceUpdate(sourceId: string, data: GeoJSON.GeoJSON) {
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

    try {
      const mapInstance = getMapInstance();
      if (mapInstance) {
        const src = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (src && "setData" in src) src.setData(update.data);
      }
    } catch {}

    lastUpdateTime.set(sourceId, now);
    pendingUpdates.delete(sourceId);
  }

  if (pendingUpdates.size > 0) scheduleFlush();
}

export function cullFeaturesToViewport(
  features: GeoJSON.Feature[],
  bounds: maplibregl.LngLatBounds,
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

const channelThrottles = new Map<string, number>();

export function shouldThrottleRealtimeUpdate(channel: string, minIntervalMs = 200): boolean {
  const now = Date.now();
  const last = channelThrottles.get(channel) || 0;
  if (now - last < minIntervalMs) return true;
  channelThrottles.set(channel, now);
  return false;
}

export function destroyPerformanceEngine() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  pendingUpdates.clear();
  lastUpdateTime.clear();
  channelThrottles.clear();
}
