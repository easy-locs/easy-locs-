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
  district?: string | null;
  country?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
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

export type AddressFormatStyle = "street_first" | "city_first" | "district_first" | "building_first";

export interface AddressFormatTemplate {
  style: AddressFormatStyle;
  separator: string;
  includePostalCode: boolean;
  postalCodePosition: "before_city" | "after_city" | "after_country";
  includeDistrict: boolean;
  includeCountry: boolean;
}

const ADDRESS_FORMAT_TEMPLATES: Record<string, AddressFormatTemplate> = {
  US: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "after_city", includeDistrict: false, includeCountry: false },
  GB: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "before_city", includeDistrict: false, includeCountry: false },
  FR: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "before_city", includeDistrict: false, includeCountry: false },
  DE: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "before_city", includeDistrict: false, includeCountry: false },
  AE: { style: "building_first", separator: ", ", includePostalCode: false, postalCodePosition: "after_city", includeDistrict: true, includeCountry: false },
  SA: { style: "district_first", separator: ", ", includePostalCode: true, postalCodePosition: "after_city", includeDistrict: true, includeCountry: false },
  JP: { style: "city_first", separator: " ", includePostalCode: true, postalCodePosition: "before_city", includeDistrict: true, includeCountry: false },
  KR: { style: "city_first", separator: " ", includePostalCode: true, postalCodePosition: "before_city", includeDistrict: true, includeCountry: false },
  IN: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "after_city", includeDistrict: true, includeCountry: false },
  BR: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "after_city", includeDistrict: true, includeCountry: false },
  EG: { style: "building_first", separator: ", ", includePostalCode: false, postalCodePosition: "after_city", includeDistrict: true, includeCountry: false },
  NG: { style: "street_first", separator: ", ", includePostalCode: false, postalCodePosition: "after_city", includeDistrict: true, includeCountry: false },
  KE: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "after_city", includeDistrict: false, includeCountry: false },
  ZA: { style: "street_first", separator: ", ", includePostalCode: true, postalCodePosition: "after_city", includeDistrict: false, includeCountry: false },
};

const DEFAULT_FORMAT: AddressFormatTemplate = {
  style: "street_first",
  separator: ", ",
  includePostalCode: true,
  postalCodePosition: "after_city",
  includeDistrict: false,
  includeCountry: true,
};

export function getAddressFormat(countryCode: string): AddressFormatTemplate {
  return ADDRESS_FORMAT_TEMPLATES[countryCode.toUpperCase()] ?? DEFAULT_FORMAT;
}

export function formatAddress(parts: {
  building?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  countryCode: string;
}): string {
  const fmt = getAddressFormat(parts.countryCode);
  const segments: string[] = [];

  if (fmt.style === "building_first") {
    if (parts.building) segments.push(parts.building);
    if (parts.street) segments.push(parts.street);
  } else if (fmt.style === "city_first") {
    if (fmt.includePostalCode && parts.postalCode && fmt.postalCodePosition === "before_city") {
      segments.push(parts.postalCode);
    }
    if (parts.city) segments.push(parts.city);
    if (fmt.includeDistrict && parts.district) segments.push(parts.district);
    if (parts.street) segments.push(parts.street);
    if (parts.building) segments.push(parts.building);
  } else if (fmt.style === "district_first") {
    if (parts.district) segments.push(parts.district);
    if (parts.street) segments.push(parts.street);
    if (parts.building) segments.push(parts.building);
  } else {
    if (parts.street) segments.push(parts.street);
    if (parts.building) segments.push(parts.building);
  }

  if (fmt.style !== "city_first") {
    if (fmt.includeDistrict && parts.district && fmt.style !== "district_first") segments.push(parts.district);
    if (fmt.includePostalCode && parts.postalCode && fmt.postalCodePosition === "before_city") {
      segments.push(parts.postalCode);
    }
    if (parts.city) segments.push(parts.city);
  }

  if (fmt.includePostalCode && parts.postalCode && fmt.postalCodePosition === "after_city") {
    segments.push(parts.postalCode);
  }

  if (fmt.includeCountry && parts.country) segments.push(parts.country);

  if (fmt.includePostalCode && parts.postalCode && fmt.postalCodePosition === "after_country") {
    segments.push(parts.postalCode);
  }

  return segments.filter(Boolean).join(fmt.separator);
}

const ADDRESS_NOISE_PATTERNS = [
  /\b(deliveroo|talabat|zomato|uber\s*eats|careem|noon|expedia|booking\.com)\b/gi,
  /\b(ground\s*floor|1st\s*floor|2nd\s*floor|3rd\s*floor|basement)\b/gi,
  /\s*-\s*(?:shop|unit|office)\s*\d+/gi,
  /\bP\.?O\.?\s*Box\s*\d+/gi,
];

export function cleanAddress(raw: string): string {
  let cleaned = raw.trim();
  for (const pattern of ADDRESS_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").replace(/^[,\s]+|[,\s]+$/g, "");
  return cleaned;
}

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

  const normalizedAddress = input.address ? cleanAddress(input.address) : "";

  return {
    lat: input.lat!,
    lng: input.lng!,
    confidence,
    sourceProvenance: input.source || "unknown",
    precisionType: input.precision || "approximate",
    normalizedAddress,
    city: input.city?.trim() || "",
    country: input.country?.trim() || "",
    countryCode: input.countryCode?.trim().toUpperCase() || "",
    zone: undefined,
    plusCode: undefined,
    fallbackApplied: false,
  };
}

export function scoreGeoConfidence(geo: CanonicalGeoEntity): number {
  let score = geo.confidence;

  if (!geo.normalizedAddress) score -= 0.10;
  else if (geo.normalizedAddress.length < 10) score -= 0.05;

  if (!geo.city) score -= 0.10;

  if (!geo.countryCode) score -= 0.05;
  else if (geo.countryCode.length !== 2) score -= 0.03;

  if (geo.fallbackApplied) score = Math.min(score, 0.1);

  const lat = geo.lat;
  const lng = geo.lng;
  if (lat === 0 && lng === 0) score = Math.min(score, 0.05);
  if (Math.abs(lat) > 85) score -= 0.05;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

export function detectGeoAnomaly(geo: CanonicalGeoEntity): string | null {
  if (geo.lat === 0 && geo.lng === 0) return "null_island";
  if (Math.abs(geo.lat) > 90 || Math.abs(geo.lng) > 180) return "out_of_range";
  if (geo.countryCode === "AE" && (geo.lat < 22 || geo.lat > 27 || geo.lng < 51 || geo.lng > 57)) return "country_mismatch";
  if (geo.countryCode === "FR" && (geo.lat < 41 || geo.lat > 51 || geo.lng < -5 || geo.lng > 10)) return "country_mismatch";
  if (geo.countryCode === "US" && (geo.lat < 24 || geo.lat > 50 || geo.lng < -125 || geo.lng > -66)) return "country_mismatch";
  if (geo.countryCode === "GB" && (geo.lat < 49 || geo.lat > 61 || geo.lng < -8 || geo.lng > 2)) return "country_mismatch";
  return null;
}
