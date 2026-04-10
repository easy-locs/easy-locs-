/**
 * RadarSourceEngine — Manages data sources feeding the radar.
 * Each source is registered with a key and provides entities.
 * Decoupled from rendering. Injectable.
 */
import type { CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface RadarSourceConfig {
  key: string;
  label: string;
  enabled: boolean;
  fetchFn: () => Promise<CanonicalRadarProjection[]>;
  refreshIntervalMs?: number;
}

export class RadarSourceEngine {
  private sources = new Map<string, RadarSourceConfig>();
  private cache = new Map<string, CanonicalRadarProjection[]>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  register(config: RadarSourceConfig) {
    this.sources.set(config.key, config);
    if (config.refreshIntervalMs && config.enabled) {
      this.startAutoRefresh(config.key, config.refreshIntervalMs);
    }
  }

  unregister(key: string) {
    this.sources.delete(key);
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) { clearInterval(timer); this.timers.delete(key); }
  }

  async fetch(key: string): Promise<CanonicalRadarProjection[]> {
    const src = this.sources.get(key);
    if (!src || !src.enabled) return [];
    try {
      const data = await src.fetchFn();
      this.cache.set(key, data);
      return data;
    } catch (err) {
      console.error(`[RadarSource] fetch failed for ${key}`, err);
      return this.cache.get(key) || [];
    }
  }

  async fetchAll(): Promise<Map<string, CanonicalRadarProjection[]>> {
    const results = new Map<string, CanonicalRadarProjection[]>();
    const keys = [...this.sources.keys()].filter(k => this.sources.get(k)?.enabled);
    await Promise.allSettled(keys.map(async k => {
      results.set(k, await this.fetch(k));
    }));
    return results;
  }

  getCached(key: string): CanonicalRadarProjection[] {
    return this.cache.get(key) || [];
  }

  getAllCached(): CanonicalRadarProjection[] {
    return [...this.cache.values()].flat();
  }

  setEnabled(key: string, enabled: boolean) {
    const src = this.sources.get(key);
    if (src) src.enabled = enabled;
  }

  private startAutoRefresh(key: string, ms: number) {
    const existing = this.timers.get(key);
    if (existing) clearInterval(existing);
    this.timers.set(key, setInterval(() => { void this.fetch(key); }, ms));
  }

  destroy() {
    this.timers.forEach(t => clearInterval(t));
    this.timers.clear();
    this.sources.clear();
    this.cache.clear();
  }
}
