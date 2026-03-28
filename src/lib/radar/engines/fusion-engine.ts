/**
 * RadarFusionEngine — Merges multiple radar source outputs into a single
 * deduplicated, prioritized entity list for rendering.
 * Injectable, stateless per call.
 */
import type { CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface FusionOptions {
  dedupRadiusMeters: number;   // cluster proximity threshold
  maxEntities: number;         // viewport cap
  priorityLayers: string[];    // render order (first = highest)
}

const DEFAULT_OPTIONS: FusionOptions = {
  dedupRadiusMeters: 50,
  maxEntities: 500,
  priorityLayers: ["driver", "merchant", "listing", "zone"],
};

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export class RadarFusionEngine {
  private options: FusionOptions;

  constructor(options?: Partial<FusionOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Merge all sources into a single deduplicated layer list */
  fuse(sourcesMap: Map<string, CanonicalRadarProjection[]>): CanonicalRadarProjection[] {
    // Flatten and sort by layer priority
    const all: CanonicalRadarProjection[] = [];
    for (const layer of this.options.priorityLayers) {
      const items = sourcesMap.get(layer) || [];
      all.push(...items);
    }
    // Add any remaining layers not in priority list
    for (const [key, items] of sourcesMap) {
      if (!this.options.priorityLayers.includes(key)) {
        all.push(...items);
      }
    }

    // Dedup by proximity
    const deduped = this.dedup(all);

    // Cap
    return deduped.slice(0, this.options.maxEntities);
  }

  private dedup(items: CanonicalRadarProjection[]): CanonicalRadarProjection[] {
    const result: CanonicalRadarProjection[] = [];
    for (const item of items) {
      const tooClose = result.some(existing =>
        existing.layerKey === item.layerKey &&
        haversineMeters(existing, item) < this.options.dedupRadiusMeters
      );
      if (!tooClose) result.push(item);
    }
    return result;
  }
}
