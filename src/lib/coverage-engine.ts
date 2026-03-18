/**
 * Coverage Engine — Category-aware geographic discovery rules.
 * Supports radius, zone, and hybrid modes per country/city/category.
 */

export type DiscoveryMode = "radius" | "zone" | "hybrid" | "unrestricted";
export type ZoneMode = "district" | "city" | "metro" | "region" | "country";
export type CoverageFamily = "hyperlocal" | "city_service" | "wide_search" | "unrestricted";

export interface CoverageRule {
  country_code: string;
  city?: string | null;
  category_key: string;
  subcategory_key?: string | null;
  discovery_mode: DiscoveryMode;
  default_radius_km?: number | null;
  min_radius_km?: number | null;
  max_radius_km?: number | null;
  zone_mode?: ZoneMode | null;
  expand_when_low_supply?: boolean;
  family: CoverageFamily;
}

/* ═══ Category Family Mapping ═══ */
const CATEGORY_FAMILIES: Record<string, CoverageFamily> = {
  // Hyperlocal — small radius, walk/bike distance
  barber: "hyperlocal",
  hairdresser: "hyperlocal",
  bakery: "hyperlocal",
  coffee: "hyperlocal",
  pharmacy: "hyperlocal",
  laundry: "hyperlocal",
  grocery: "hyperlocal",
  restaurant: "hyperlocal",
  food: "hyperlocal",

  // City service — larger radius, drive distance
  plumber: "city_service",
  electrician: "city_service",
  mechanic: "city_service",
  cleaning: "city_service",
  beauty: "city_service",
  repair: "city_service",
  handyman: "city_service",
  tutor: "city_service",
  fitness: "city_service",
  taxi: "city_service",
  delivery: "city_service",
  courier: "city_service",

  // Wide search — district/city/metro
  property: "wide_search",
  rentals: "wide_search",
  stays: "wide_search",
  hotels: "wide_search",
  jobs: "wide_search",
  marketplace: "wide_search",
  shops: "wide_search",

  // Unrestricted — no geographic constraint, country/region-wide
  activities: "unrestricted",
  transport: "unrestricted",
  events: "unrestricted",
  travel: "unrestricted",
};

/* ═══ Family Default Radii ═══ */
const FAMILY_DEFAULTS: Record<CoverageFamily, { default_radius_km: number; min_radius_km: number; max_radius_km: number }> = {
  hyperlocal:    { default_radius_km: 3,   min_radius_km: 0.5, max_radius_km: 8 },
  city_service:  { default_radius_km: 15,  min_radius_km: 3,   max_radius_km: 50 },
  wide_search:   { default_radius_km: 50,  min_radius_km: 5,   max_radius_km: 200 },
  unrestricted:  { default_radius_km: 500, min_radius_km: 10,  max_radius_km: 9999 },
};

/* ═══ Category-Specific Rules ═══ */
const CATEGORY_RULES: Record<string, Partial<CoverageRule>> = {
  barber:       { discovery_mode: "radius", default_radius_km: 2, max_radius_km: 5 },
  hairdresser:  { discovery_mode: "radius", default_radius_km: 3, max_radius_km: 8 },
  bakery:       { discovery_mode: "radius", default_radius_km: 1.5, max_radius_km: 5 },
  coffee:       { discovery_mode: "radius", default_radius_km: 1, max_radius_km: 4 },
  grocery:      { discovery_mode: "radius", default_radius_km: 3, max_radius_km: 10 },
  food:         { discovery_mode: "radius", default_radius_km: 5, max_radius_km: 15 },
  restaurant:   { discovery_mode: "radius", default_radius_km: 5, max_radius_km: 15 },
  pharmacy:     { discovery_mode: "radius", default_radius_km: 2, max_radius_km: 8, expand_when_low_supply: true },

  plumber:      { discovery_mode: "radius", default_radius_km: 20, max_radius_km: 50, expand_when_low_supply: true },
  electrician:  { discovery_mode: "radius", default_radius_km: 20, max_radius_km: 50, expand_when_low_supply: true },
  mechanic:     { discovery_mode: "radius", default_radius_km: 15, max_radius_km: 40 },
  cleaning:     { discovery_mode: "radius", default_radius_km: 10, max_radius_km: 30 },
  beauty:       { discovery_mode: "radius", default_radius_km: 8, max_radius_km: 20 },

  taxi:         { discovery_mode: "hybrid", default_radius_km: 5, zone_mode: "city" },
  delivery:     { discovery_mode: "hybrid", default_radius_km: 10, zone_mode: "city" },
  courier:      { discovery_mode: "hybrid", default_radius_km: 15, zone_mode: "metro" },

  property:     { discovery_mode: "zone", zone_mode: "city" },
  rentals:      { discovery_mode: "zone", zone_mode: "district" },
  stays:        { discovery_mode: "zone", zone_mode: "city" },
  hotels:       { discovery_mode: "zone", zone_mode: "city" },
  marketplace:  { discovery_mode: "zone", zone_mode: "metro" },

  activities:   { discovery_mode: "unrestricted", zone_mode: "region" },
  transport:    { discovery_mode: "unrestricted", zone_mode: "country" },
  events:       { discovery_mode: "unrestricted", zone_mode: "region" },
  travel:       { discovery_mode: "unrestricted", zone_mode: "country" },
};

/* ═══ Country Overrides ═══ */
const COUNTRY_OVERRIDES: Record<string, Partial<Record<string, Partial<CoverageRule>>>> = {
  AE: {
    taxi: { default_radius_km: 8, zone_mode: "metro" },
    delivery: { default_radius_km: 15 },
    grocery: { default_radius_km: 5 },
  },
  MA: {
    barber: { default_radius_km: 1, max_radius_km: 3 },
    taxi: { default_radius_km: 3, zone_mode: "city" },
  },
  JP: {
    grocery: { default_radius_km: 1, max_radius_km: 3 },
    food: { default_radius_km: 3 },
  },
};

/**
 * Get the coverage rule for a given context.
 */
export function getCoverageRule(opts: {
  country_code: string;
  city?: string | null;
  category_key: string;
  subcategory_key?: string | null;
}): CoverageRule {
  const { country_code, city, category_key, subcategory_key } = opts;
  const family = CATEGORY_FAMILIES[category_key] || "city_service";
  const familyDefaults = FAMILY_DEFAULTS[family];
  const categoryDefaults = CATEGORY_RULES[category_key] || {};
  const countryOverride = COUNTRY_OVERRIDES[country_code.toUpperCase()]?.[category_key] || {};

  return {
    country_code: country_code.toUpperCase(),
    city: city || null,
    category_key,
    subcategory_key: subcategory_key || null,
    family,
    discovery_mode: countryOverride.discovery_mode || categoryDefaults.discovery_mode || "radius",
    default_radius_km: countryOverride.default_radius_km ?? categoryDefaults.default_radius_km ?? familyDefaults.default_radius_km,
    min_radius_km: countryOverride.min_radius_km ?? categoryDefaults.min_radius_km ?? familyDefaults.min_radius_km,
    max_radius_km: countryOverride.max_radius_km ?? categoryDefaults.max_radius_km ?? familyDefaults.max_radius_km,
    zone_mode: countryOverride.zone_mode ?? categoryDefaults.zone_mode ?? null,
    expand_when_low_supply: countryOverride.expand_when_low_supply ?? categoryDefaults.expand_when_low_supply ?? false,
  };
}

/**
 * Check if radius search applies for this coverage rule.
 */
export function usesRadius(rule: CoverageRule): boolean {
  return rule.discovery_mode === "radius" || rule.discovery_mode === "hybrid";
}

/**
 * Check if zone search applies for this coverage rule.
 */
export function usesZone(rule: CoverageRule): boolean {
  return rule.discovery_mode === "zone" || rule.discovery_mode === "hybrid";
}

/**
 * Get human label for coverage display.
 */
export function getCoverageLabel(rule: CoverageRule): string {
  if (rule.discovery_mode === "unrestricted") {
    return rule.zone_mode === "country" ? "Nationwide" : rule.zone_mode === "region" ? "Your region" : "Everywhere";
  }
  if (rule.discovery_mode === "zone") {
    const labels: Record<string, string> = { district: "Your district", city: "Your city", metro: "Metro area", region: "Your region", country: "Nationwide" };
    return labels[rule.zone_mode || "city"] || "Your city";
  }
  if (rule.discovery_mode === "hybrid") {
    return `${rule.default_radius_km}km + ${rule.zone_mode || "city"}`;
  }
  return `Within ${rule.default_radius_km}km`;
}

/**
 * Discovery Scope — determines if a category restricts results geographically.
 */
export function isGeographicallyRestricted(category: string): boolean {
  const family = getCategoryFamily(category);
  return family === "hyperlocal" || family === "city_service";
}

/**
 * Should the UI show a radius slider for this category?
 */
export function showsRadiusControl(category: string): boolean {
  const family = getCategoryFamily(category);
  return family === "hyperlocal" || family === "city_service";
}

/**
 * Should the UI show zone/region filters for this category?
 */
export function showsZoneFilter(category: string): boolean {
  const family = getCategoryFamily(category);
  return family === "wide_search" || family === "unrestricted";
}

/** Get all category families for reference */
export function getCategoryFamily(category: string): CoverageFamily {
  return CATEGORY_FAMILIES[category] || "city_service";
}
