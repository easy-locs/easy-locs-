/**
 * geo-normalizer — Single entry point for normalizing any geo input
 * into a CanonicalGeoEntity. All geo must pass through here.
 */
import type { CanonicalGeoEntity } from "@/lib/domains/canonical-entities";

export interface RawGeoInput {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  source?: string;
  precision?: "gps" | "address" | "approximate" | "fallback";
}

const DEFAULTS: CanonicalGeoEntity = {
  lat: 25.2048,
  lng: 55.2708,
  confidence: 0,
  sourceProvenance: "default",
  precisionType: "fallback",
  normalizedAddress: "Dubai, UAE",
  city: "Dubai",
  country: "United Arab Emirates",
  countryCode: "AE",
  zone: undefined,
  plusCode: undefined,
  fallbackApplied: true,
};

export function normalizeGeo(input: RawGeoInput): CanonicalGeoEntity {
  const hasCoords = typeof input.lat === "number" && typeof input.lng === "number"
    && input.lat !== 0 && input.lng !== 0
    && Math.abs(input.lat) <= 90 && Math.abs(input.lng) <= 180;

  if (!hasCoords) {
    return { ...DEFAULTS, fallbackApplied: true };
  }

  const confidence = input.precision === "gps" ? 0.95
    : input.precision === "address" ? 0.80
    : input.precision === "approximate" ? 0.50
    : 0.30;

  return {
    lat: input.lat!,
    lng: input.lng!,
    confidence,
    sourceProvenance: input.source || "unknown",
    precisionType: input.precision || "approximate",
    normalizedAddress: input.address?.trim() || "",
    city: input.city?.trim() || "",
    country: input.country?.trim() || "",
    countryCode: input.countryCode?.trim().toUpperCase() || "",
    zone: undefined,
    plusCode: undefined,
    fallbackApplied: false,
  };
}

/** Score geo confidence 0–1 */
export function scoreGeoConfidence(geo: CanonicalGeoEntity): number {
  let score = geo.confidence;
  if (!geo.normalizedAddress) score -= 0.1;
  if (!geo.city) score -= 0.1;
  if (!geo.countryCode) score -= 0.05;
  if (geo.fallbackApplied) score = Math.min(score, 0.1);
  return Math.max(0, Math.min(1, score));
}
