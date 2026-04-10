/**
 * RadarFilterEngine — Applies dynamic filters to canonical radar projections.
 * Stateless per call. Injectable.
 */
import type { CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface RadarFilter {
  key: string;
  label: string;
  active: boolean;
  predicate: (item: CanonicalRadarProjection) => boolean;
}

export class RadarFilterEngine {
  private filters = new Map<string, RadarFilter>();

  register(filter: RadarFilter) {
    this.filters.set(filter.key, filter);
  }

  unregister(key: string) {
    this.filters.delete(key);
  }

  setActive(key: string, active: boolean) {
    const f = this.filters.get(key);
    if (f) f.active = active;
  }

  apply(items: CanonicalRadarProjection[]): CanonicalRadarProjection[] {
    const active = [...this.filters.values()].filter(f => f.active);
    if (!active.length) return items;
    return items.filter(item => active.every(f => f.predicate(item)));
  }

  getAll(): RadarFilter[] {
    return [...this.filters.values()];
  }

  getActive(): RadarFilter[] {
    return [...this.filters.values()].filter(f => f.active);
  }

  clearAll() {
    this.filters.forEach(f => { f.active = false; });
  }

  destroy() {
    this.filters.clear();
  }
}
