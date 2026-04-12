import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type {
  GeoContext,
  GeoContextUnresolved,
  ResolvedGeoContext,
  GeoHierarchyLevel,
  GeoResolutionConfidence,
  CanonicalGeoPosition,
  CurrencyCode,
} from "@/domains/shared/canonical-types";
import { reverseGeocode, type GeoCoords } from "@/lib/geo/geo-resolver";

const COUNTRY_DEFAULTS: Record<string, {
  name: string;
  timezone: string;
  writingDirection: "ltr" | "rtl";
  unitSystem: "metric" | "imperial";
  calendarType: "gregorian" | "hijri" | "both";
  defaultLocale: string;
  defaultCurrency: CurrencyCode;
}> = {
  AE: { name: "United Arab Emirates", timezone: "Asia/Dubai", writingDirection: "rtl", unitSystem: "metric", calendarType: "both", defaultLocale: "ar-AE", defaultCurrency: "AED" },
  SA: { name: "Saudi Arabia", timezone: "Asia/Riyadh", writingDirection: "rtl", unitSystem: "metric", calendarType: "hijri", defaultLocale: "ar-SA", defaultCurrency: "SAR" },
  MA: { name: "Morocco", timezone: "Africa/Casablanca", writingDirection: "rtl", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "fr-MA", defaultCurrency: "MAD" },
  EG: { name: "Egypt", timezone: "Africa/Cairo", writingDirection: "rtl", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "ar-EG", defaultCurrency: "EGP" },
  TN: { name: "Tunisia", timezone: "Africa/Tunis", writingDirection: "rtl", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "ar-TN", defaultCurrency: "TND" },
  TR: { name: "Turkey", timezone: "Europe/Istanbul", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "tr-TR", defaultCurrency: "TRY" },
  GB: { name: "United Kingdom", timezone: "Europe/London", writingDirection: "ltr", unitSystem: "imperial", calendarType: "gregorian", defaultLocale: "en-GB", defaultCurrency: "GBP" },
  FR: { name: "France", timezone: "Europe/Paris", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "fr-FR", defaultCurrency: "EUR" },
  US: { name: "United States", timezone: "America/New_York", writingDirection: "ltr", unitSystem: "imperial", calendarType: "gregorian", defaultLocale: "en-US", defaultCurrency: "USD" },
  IN: { name: "India", timezone: "Asia/Kolkata", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "en-IN", defaultCurrency: "INR" },
  SN: { name: "Senegal", timezone: "Africa/Dakar", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "fr-SN", defaultCurrency: "XOF" },
  CI: { name: "Côte d'Ivoire", timezone: "Africa/Abidjan", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "fr-CI", defaultCurrency: "XOF" },
  CM: { name: "Cameroon", timezone: "Africa/Douala", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", defaultLocale: "fr-CM", defaultCurrency: "XAF" },
};

const hierarchyCache = new Map<string, GeoHierarchyLevel[]>();
const contextCache = new Map<string, { context: ResolvedGeoContext; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function buildCacheKey(coords: GeoCoords): string {
  return `${coords.lat.toFixed(3)}_${coords.lng.toFixed(3)}`;
}

function buildUnresolved(
  coords: CanonicalGeoPosition | null,
  source: GeoContext["source"],
  reason: string
): GeoContextUnresolved {
  return {
    countryCode: null,
    countryName: null,
    regionCode: null,
    regionName: null,
    cityId: null,
    cityName: null,
    districtId: null,
    districtName: null,
    postalCode: null,
    coordinates: coords,
    radiusKm: null,
    timezone: null,
    writingDirection: null,
    unitSystem: null,
    calendarType: null,
    defaultLocale: null,
    defaultCurrency: null,
    confidence: "unresolved",
    resolvedAt: new Date().toISOString(),
    source,
    failureReason: reason,
  };
}

function assessConfidence(
  countryCode: string | null,
  city: string | null,
  postalCode: string | null,
  source: GeoContext["source"]
): GeoResolutionConfidence {
  if (!countryCode) return "unresolved";
  if (source === "fallback") return "low";
  let score = 0;
  if (countryCode) score += 1;
  if (city) score += 1;
  if (postalCode) score += 1;
  if (source === "gps") score += 1;
  if (score >= 3) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export async function resolveGeoContext(
  coords: GeoCoords,
  source: GeoContext["source"] = "gps"
): Promise<ResolvedGeoContext> {
  const cacheKey = buildCacheKey(coords);
  const cached = contextCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  const position: CanonicalGeoPosition = {
    lat: coords.lat,
    lng: coords.lng,
    accuracy: null,
    updatedAt: new Date().toISOString(),
  };

  try {
    const resolved = await reverseGeocode(coords);
    if (!resolved || !resolved.countryCode) {
      const unresolved = buildUnresolved(position, source, "Reverse geocode returned no country");
      unresolvedCount++;
      contextCache.set(cacheKey, { context: unresolved, expiresAt: Date.now() + CACHE_TTL_MS });
      return unresolved;
    }

    const countryCode = resolved.countryCode.toUpperCase();
    const defaults = COUNTRY_DEFAULTS[countryCode];
    const confidence = assessConfidence(countryCode, resolved.city, resolved.postalCode, source);

    const context: GeoContext = {
      countryCode,
      countryName: defaults?.name ?? resolved.country ?? countryCode,
      regionCode: null,
      regionName: null,
      cityId: resolved.city?.toLowerCase().replace(/\s+/g, "_") ?? null,
      cityName: resolved.city,
      districtId: null,
      districtName: null,
      postalCode: resolved.postalCode,
      coordinates: position,
      radiusKm: confidence === "high" ? 5 : confidence === "medium" ? 15 : 50,
      timezone: defaults?.timezone ?? "UTC",
      writingDirection: defaults?.writingDirection ?? "ltr",
      unitSystem: defaults?.unitSystem ?? "metric",
      calendarType: defaults?.calendarType ?? "gregorian",
      defaultLocale: defaults?.defaultLocale ?? "en",
      defaultCurrency: defaults?.defaultCurrency ?? "USD",
      confidence,
      resolvedAt: new Date().toISOString(),
      source,
    };

    resolvedCount++;
    contextCache.set(cacheKey, { context, expiresAt: Date.now() + CACHE_TTL_MS });

    const hierarchy: GeoHierarchyLevel[] = [
      { level: "country", code: countryCode, name: context.countryName, parentCode: null, metadata: {} },
    ];
    if (context.cityName && context.cityId) {
      hierarchy.push({ level: "city", code: context.cityId, name: context.cityName, parentCode: countryCode, metadata: {} });
    }
    if (context.postalCode) {
      hierarchy.push({ level: "postal", code: context.postalCode, name: context.postalCode, parentCode: context.cityId ?? countryCode, metadata: {} });
    }
    hierarchyCache.set(cacheKey, hierarchy);

    return context;
  } catch (err) {
    unresolvedCount++;
    const unresolved = buildUnresolved(position, source, err instanceof Error ? err.message : "Unknown error");
    contextCache.set(cacheKey, { context: unresolved, expiresAt: Date.now() + CACHE_TTL_MS });
    return unresolved;
  }
}

export function resolveGeoContextFromCountryCode(
  countryCode: string,
  source: GeoContext["source"] = "manual"
): ResolvedGeoContext {
  const code = countryCode.toUpperCase();
  const defaults = COUNTRY_DEFAULTS[code];
  if (!defaults) {
    return buildUnresolved(null, source, `Unknown country code: ${code}`);
  }

  return {
    countryCode: code,
    countryName: defaults.name,
    regionCode: null,
    regionName: null,
    cityId: null,
    cityName: null,
    districtId: null,
    districtName: null,
    postalCode: null,
    coordinates: null,
    radiusKm: 100,
    timezone: defaults.timezone,
    writingDirection: defaults.writingDirection,
    unitSystem: defaults.unitSystem,
    calendarType: defaults.calendarType,
    defaultLocale: defaults.defaultLocale,
    defaultCurrency: defaults.defaultCurrency,
    confidence: "low",
    resolvedAt: new Date().toISOString(),
    source,
  };
}

export function getHierarchy(coords: GeoCoords): GeoHierarchyLevel[] {
  return hierarchyCache.get(buildCacheKey(coords)) ?? [];
}

export function isResolved(ctx: ResolvedGeoContext): ctx is GeoContext {
  return ctx.confidence !== "unresolved";
}

export function clearGeoCache(): void {
  contextCache.clear();
  hierarchyCache.clear();
}

export function getSupportedCountries(): string[] {
  return Object.keys(COUNTRY_DEFAULTS);
}

let lastTickResult: EngineTickResult | null = null;
let resolvedCount = 0;
let unresolvedCount = 0;

export class GeoHierarchyEngine extends BaseEngine {
  constructor() {
    super({
      id: "geo-hierarchy",
      name: "Geo Hierarchy Engine",
      category: "context",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const start = Date.now();
    const findings: string[] = [];

    const cacheSize = contextCache.size;
    const hierarchySize = hierarchyCache.size;

    let expired = 0;
    const now = Date.now();
    for (const [key, entry] of contextCache.entries()) {
      if (entry.expiresAt < now) {
        contextCache.delete(key);
        hierarchyCache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      findings.push(`Evicted ${expired} expired cache entries`);
    }

    findings.push(`Cache: ${contextCache.size} active, ${hierarchySize} hierarchies`);
    findings.push(`Stats: ${resolvedCount} resolved, ${unresolvedCount} unresolved`);

    lastTickResult = {
      level: "observe",
      findings: findings.length,
      actions: findings,
      duration: Date.now() - start,
    };

    return lastTickResult;
  }

  getStats() {
    return {
      ...super.stats,
      cacheSize: contextCache.size,
      hierarchyCacheSize: hierarchyCache.size,
      resolvedCount,
      unresolvedCount,
      supportedCountries: getSupportedCountries().length,
    };
  }
}

export const geoHierarchyEngine = new GeoHierarchyEngine();
