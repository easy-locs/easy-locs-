/**
 * geo-canonical-resolver — Resolves raw geo inputs into canonical entities.
 * Wraps normalizer + conflict engine. Separate from legacy geo-resolver.
 */
import { normalizeGeo, scoreGeoConfidence, type RawGeoInput } from "./geo-normalizer";
import { resolveGeoConflict, type GeoCandidate } from "./geo-conflict-engine";
import type { CanonicalGeoEntity } from "@/lib/domains/canonical-entities";

const DUBAI_FALLBACK: CanonicalGeoEntity = {
  lat: 25.2048, lng: 55.2708, confidence: 0,
  sourceProvenance: "default", precisionType: "fallback",
  normalizedAddress: "Dubai, UAE", city: "Dubai",
  country: "United Arab Emirates", countryCode: "AE",
  fallbackApplied: true,
};

/** Resolve a single raw input into canonical geo */
export function resolveCanonicalGeo(input: RawGeoInput): CanonicalGeoEntity {
  const geo = normalizeGeo(input);
  return geo.fallbackApplied ? { ...DUBAI_FALLBACK } : geo;
}

/** Resolve from multiple sources — best wins via conflict engine */
export function resolveCanonicalGeoFromSources(candidates: GeoCandidate[]): CanonicalGeoEntity {
  if (!candidates.length) return { ...DUBAI_FALLBACK };
  return resolveGeoConflict(candidates).winner;
}

/** Score a geo entity for quality gating */
export function scoreCanonicalGeo(geo: CanonicalGeoEntity): number {
  return scoreGeoConfidence(geo);
}

/** Check if geo is usable (not fallback, reasonable confidence) */
export function isGeoUsable(geo: CanonicalGeoEntity): boolean {
  return !geo.fallbackApplied && geo.confidence >= 0.3;
}
