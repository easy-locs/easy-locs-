/**
 * geo-fallback — Manages fallback chain for geo resolution.
 * GPS → IP → Manual → Default city.
 */
import type { CanonicalGeoEntity } from "@/lib/domains/canonical-entities";

export interface FallbackConfig {
  defaultCity: { lat: number; lng: number; city: string; country: string; countryCode: string };
  ipLookupEnabled: boolean;
  maxAgeMs: number; // max age before re-resolving
}

const DEFAULT_CONFIG: FallbackConfig = {
  defaultCity: { lat: 25.2048, lng: 55.2708, city: "Dubai", country: "United Arab Emirates", countryCode: "AE" },
  ipLookupEnabled: true,
  maxAgeMs: 5 * 60 * 1000,
};

export class GeoFallbackEngine {
  private config: FallbackConfig;
  private lastResolved: CanonicalGeoEntity | null = null;
  private lastResolvedAt = 0;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Get cached or default fallback */
  getFallback(): CanonicalGeoEntity {
    if (this.lastResolved && (Date.now() - this.lastResolvedAt) < this.config.maxAgeMs) {
      return this.lastResolved;
    }
    const c = this.config.defaultCity;
    return {
      lat: c.lat, lng: c.lng,
      confidence: 0, sourceProvenance: "default", precisionType: "fallback",
      normalizedAddress: `${c.city}, ${c.country}`,
      city: c.city, country: c.country, countryCode: c.countryCode,
      fallbackApplied: true,
    };
  }

  /** Cache a resolved geo as the new fallback */
  cacheResolved(geo: CanonicalGeoEntity) {
    this.lastResolved = geo;
    this.lastResolvedAt = Date.now();
  }

  /** Check if we need to re-resolve */
  isStale(): boolean {
    return !this.lastResolved || (Date.now() - this.lastResolvedAt) > this.config.maxAgeMs;
  }
}
