/**
 * TaxonomyRegistry — Unified single source of truth for all taxonomy alias lookups.
 *
 * Consolidates the three previously fragmented alias sources:
 *   1. taxonomy-aliases.ts (VERTICAL_ALIASES, SUBCATEGORY_ALIASES)
 *   2. alias-resolver.ts (SOURCE_LABEL_MAP with canonical paths)
 *   3. canonical-registry.ts (CanonicalFamily trees with aliases)
 *
 * Design rules:
 * - Every input resolves to exactly one vertical + cluster + canonical type
 * - Conflicts are resolved deterministically (healthcare beats shops for "pharmacy")
 * - Unknown subcategories are flagged for review (never silently passed through)
 */

import type { Vertical } from "./world-class-taxonomy";
import { VERTICAL_ALIASES, SUBCATEGORY_ALIASES, normalizeVertical, normalizeSubcategory } from "./taxonomy-aliases";

export interface TaxonomyResolution {
  vertical: Vertical;
  cluster: string | null;
  canonicalType: string | null;
  subcategory: string | null;
  confidence: number;
  source: "brand_cache" | "canonical_path" | "vertical_alias" | "subcategory_alias" | "unknown";
  flaggedForReview: boolean;
  conflictsResolved: string[];
}

/**
 * Canonical conflict resolution table.
 * When a raw key appears in multiple verticals, this table determines the winner.
 * Priority: explicit overrides > healthcare > food > grocery > services > shops
 */
const CONFLICT_OVERRIDES: Record<string, Vertical> = {
  pharmacy: "healthcare",
  pharmacie: "healthcare",
  drugstore: "healthcare",
  apothecary: "healthcare",
  clinic: "healthcare",
  hospital: "healthcare",
  doctor: "healthcare",
  dentist: "healthcare",
};

/**
 * Unified canonical path registry.
 * Merges SOURCE_LABEL_MAP entries and resolves them to { vertical, cluster, canonicalType }.
 * Order is authoritative — first match wins for each key.
 */
// All canonicalType values MUST exactly match an entry in vertical-boundary-guard.ts
// allowedSubcategories for the given vertical, so that guardSubcategory() accepts them.
const CANONICAL_PATH_MAP: Record<string, { vertical: Vertical; cluster: string; canonicalType: string; confidence: number }> = {
  // ── food ──────────────────────────────────────────────────────────────────
  "fine dining restaurant":       { vertical: "food",       cluster: "restaurant",      canonicalType: "fine_dining",              confidence: 0.95 },
  "fine dining":                  { vertical: "food",       cluster: "restaurant",      canonicalType: "fine_dining",              confidence: 0.90 },
  "casual dining restaurant":     { vertical: "food",       cluster: "restaurant",      canonicalType: "casual_dining",            confidence: 0.90 },
  "fast food restaurant":         { vertical: "food",       cluster: "fast_food",       canonicalType: "fast_food",                confidence: 0.95 },
  "fast food":                    { vertical: "food",       cluster: "fast_food",       canonicalType: "fast_food",                confidence: 0.90 },
  "coffee shop":                  { vertical: "food",       cluster: "cafe",            canonicalType: "coffee_shop",              confidence: 0.95 },
  "cafe":                         { vertical: "food",       cluster: "cafe",            canonicalType: "coffee_shop",              confidence: 0.85 },
  "bakery":                       { vertical: "food",       cluster: "cafe",            canonicalType: "bakery",                   confidence: 0.95 },
  "restaurant":                   { vertical: "food",       cluster: "restaurant",      canonicalType: "casual_dining",            confidence: 0.85 },
  "ghost kitchen":                { vertical: "food",       cluster: "cloud_kitchen",   canonicalType: "cloud_kitchen",            confidence: 0.90 },
  "dark kitchen":                 { vertical: "food",       cluster: "cloud_kitchen",   canonicalType: "cloud_kitchen",            confidence: 0.90 },
  "cloud kitchen":                { vertical: "food",       cluster: "cloud_kitchen",   canonicalType: "cloud_kitchen",            confidence: 0.90 },
  // ── stay ──────────────────────────────────────────────────────────────────
  "hotel":                        { vertical: "stay",       cluster: "hotel",           canonicalType: "business_hotel",           confidence: 0.80 },
  "boutique hotel":               { vertical: "stay",       cluster: "hotel",           canonicalType: "boutique_hotel",           confidence: 0.95 },
  "business hotel":               { vertical: "stay",       cluster: "hotel",           canonicalType: "business_hotel",           confidence: 0.95 },
  "resort":                       { vertical: "stay",       cluster: "hotel",           canonicalType: "resort",                   confidence: 0.90 },
  "hostel":                       { vertical: "stay",       cluster: "holiday_rental",  canonicalType: "holiday_home",             confidence: 0.75 },
  "serviced apartment":           { vertical: "stay",       cluster: "aparthotel",      canonicalType: "serviced_apartment",       confidence: 0.95 },
  "apart hotel":                  { vertical: "stay",       cluster: "aparthotel",      canonicalType: "serviced_apartment",       confidence: 0.95 },
  "holiday home":                 { vertical: "stay",       cluster: "holiday_rental",  canonicalType: "holiday_home",             confidence: 0.90 },
  // ── healthcare ────────────────────────────────────────────────────────────
  "general clinic":               { vertical: "healthcare", cluster: "clinic",          canonicalType: "general",                  confidence: 0.95 },
  "medical center":               { vertical: "healthcare", cluster: "clinic",          canonicalType: "general",                  confidence: 0.90 },
  "dental clinic":                { vertical: "healthcare", cluster: "clinic",          canonicalType: "dental",                   confidence: 0.95 },
  "dentist":                      { vertical: "healthcare", cluster: "clinic",          canonicalType: "dental",                   confidence: 0.95 },
  "pharmacy":                     { vertical: "healthcare", cluster: "pharmacy",        canonicalType: "retail_pharmacy",          confidence: 0.95 },
  "pharmacie":                    { vertical: "healthcare", cluster: "pharmacy",        canonicalType: "retail_pharmacy",          confidence: 0.95 },
  "drugstore":                    { vertical: "healthcare", cluster: "pharmacy",        canonicalType: "retail_pharmacy",          confidence: 0.90 },
  "hospital":                     { vertical: "healthcare", cluster: "hospital",        canonicalType: "general_hospital",         confidence: 0.95 },
  "general hospital":             { vertical: "healthcare", cluster: "hospital",        canonicalType: "general_hospital",         confidence: 0.95 },
  "diagnostic lab":               { vertical: "healthcare", cluster: "lab",             canonicalType: "diagnostic_lab",           confidence: 0.90 },
  // ── beauty ────────────────────────────────────────────────────────────────
  "gym":                          { vertical: "beauty",     cluster: "gym",             canonicalType: "general_gym",              confidence: 0.95 },
  "fitness center":               { vertical: "beauty",     cluster: "gym",             canonicalType: "general_gym",              confidence: 0.95 },
  "yoga studio":                  { vertical: "beauty",     cluster: "gym",             canonicalType: "yoga_studio",              confidence: 0.95 },
  "pilates studio":               { vertical: "beauty",     cluster: "gym",             canonicalType: "pilates_studio",           confidence: 0.95 },
  "crossfit box":                 { vertical: "beauty",     cluster: "gym",             canonicalType: "crossfit",                 confidence: 0.95 },
  "day spa":                      { vertical: "beauty",     cluster: "spa",             canonicalType: "day_spa",                  confidence: 0.95 },
  "spa":                          { vertical: "beauty",     cluster: "spa",             canonicalType: "day_spa",                  confidence: 0.85 },
  "hair salon":                   { vertical: "beauty",     cluster: "salon",           canonicalType: "hair_salon",               confidence: 0.95 },
  "barbershop":                   { vertical: "beauty",     cluster: "salon",           canonicalType: "barber_shop",              confidence: 0.90 },
  "nail salon":                   { vertical: "beauty",     cluster: "salon",           canonicalType: "nail_studio",              confidence: 0.95 },
  // ── grocery ───────────────────────────────────────────────────────────────
  "supermarket":                  { vertical: "grocery",    cluster: "supermarket",     canonicalType: "supermarket",              confidence: 0.95 },
  "hypermarket":                  { vertical: "grocery",    cluster: "supermarket",     canonicalType: "hypermarket",              confidence: 0.95 },
  "grocery store":                { vertical: "grocery",    cluster: "supermarket",     canonicalType: "supermarket",              confidence: 0.90 },
  "mini mart":                    { vertical: "grocery",    cluster: "supermarket",     canonicalType: "mini_mart",                confidence: 0.85 },
  // ── services ──────────────────────────────────────────────────────────────
  "plumber":                      { vertical: "services",   cluster: "home_services",   canonicalType: "plumber",                  confidence: 0.95 },
  "electrician":                  { vertical: "services",   cluster: "home_services",   canonicalType: "electrician",              confidence: 0.95 },
  "cleaning service":             { vertical: "services",   cluster: "home_services",   canonicalType: "cleaning",                 confidence: 0.95 },
  "moving company":               { vertical: "services",   cluster: "home_services",   canonicalType: "moving",                   confidence: 0.95 },
  "lawyer":                       { vertical: "services",   cluster: "professional",    canonicalType: "lawyer",                   confidence: 0.95 },
  "law firm":                     { vertical: "services",   cluster: "professional",    canonicalType: "lawyer",                   confidence: 0.95 },
  "accountant":                   { vertical: "services",   cluster: "professional",    canonicalType: "accountant",               confidence: 0.95 },
  "car repair":                   { vertical: "services",   cluster: "vehicle",         canonicalType: "car_repair",               confidence: 0.95 },
  "car wash":                     { vertical: "services",   cluster: "vehicle",         canonicalType: "car_wash",                 confidence: 0.95 },
  // ── mobility ──────────────────────────────────────────────────────────────
  "taxi":                         { vertical: "mobility",   cluster: "ride_hailing",    canonicalType: "ride_hailing",             confidence: 0.90 },
  "car rental":                   { vertical: "mobility",   cluster: "rental",          canonicalType: "car_rental",               confidence: 0.95 },
  // ── utility ───────────────────────────────────────────────────────────────
  "gas station":                  { vertical: "utility",    cluster: "fuel",            canonicalType: "fuel_station",             confidence: 0.95 },
  "petrol station":               { vertical: "utility",    cluster: "fuel",            canonicalType: "fuel_station",             confidence: 0.95 },
  "fuel station":                 { vertical: "utility",    cluster: "fuel",            canonicalType: "fuel_station",             confidence: 0.95 },
  "atm":                          { vertical: "utility",    cluster: "atm",             canonicalType: "atm",                      confidence: 0.95 },
  "parking":                      { vertical: "utility",    cluster: "parking",         canonicalType: "parking",                  confidence: 0.90 },
  // ── experiences ───────────────────────────────────────────────────────────
  "theme park":                   { vertical: "experiences", cluster: "entertainment",  canonicalType: "theme_park",               confidence: 0.95 },
  "cinema":                       { vertical: "experiences", cluster: "entertainment",  canonicalType: "cinema",                   confidence: 0.95 },
  "desert safari":                { vertical: "experiences", cluster: "tours",          canonicalType: "desert_safari",            confidence: 0.95 },
};

export class TaxonomyRegistry {
  private static readonly _instance: TaxonomyRegistry = new TaxonomyRegistry();

  static getInstance(): TaxonomyRegistry {
    return TaxonomyRegistry._instance;
  }

  /**
   * Primary resolution method. Given any raw label/category string,
   * returns a fully resolved TaxonomyResolution with no conflicts.
   */
  resolve(rawInput: string | null | undefined): TaxonomyResolution {
    if (!rawInput) {
      return this._unknown(rawInput ?? "");
    }

    const normalized = rawInput.toLowerCase().trim();

    if (CONFLICT_OVERRIDES[normalized]) {
      return {
        vertical: CONFLICT_OVERRIDES[normalized],
        cluster: this._clusterFromCanonicalPath(normalized),
        canonicalType: this._canonicalTypeFromPath(normalized),
        subcategory: null,
        confidence: 0.95,
        source: "canonical_path",
        flaggedForReview: false,
        conflictsResolved: [`"${normalized}" conflict resolved → ${CONFLICT_OVERRIDES[normalized]} (override)`],
      };
    }

    const pathEntry = CANONICAL_PATH_MAP[normalized];
    if (pathEntry) {
      return {
        vertical: pathEntry.vertical,
        cluster: pathEntry.cluster,
        canonicalType: pathEntry.canonicalType,
        subcategory: pathEntry.canonicalType,
        confidence: pathEntry.confidence,
        source: "canonical_path",
        flaggedForReview: false,
        conflictsResolved: [],
      };
    }

    for (const [label, entry] of Object.entries(CANONICAL_PATH_MAP)) {
      if (normalized.includes(label)) {
        return {
          vertical: entry.vertical,
          cluster: entry.cluster,
          canonicalType: entry.canonicalType,
          subcategory: entry.canonicalType,
          confidence: entry.confidence * 0.85,
          source: "canonical_path",
          flaggedForReview: false,
          conflictsResolved: [],
        };
      }
    }

    const vertical = VERTICAL_ALIASES[normalized];
    if (vertical) {
      return {
        vertical,
        cluster: null,
        canonicalType: null,
        subcategory: null,
        confidence: 0.75,
        source: "vertical_alias",
        flaggedForReview: false,
        conflictsResolved: [],
      };
    }

    const subcategoryAlias = SUBCATEGORY_ALIASES[normalized];
    if (subcategoryAlias) {
      const subcatVertical = this._inferVerticalFromSubcategory(subcategoryAlias);
      return {
        vertical: subcatVertical ?? "services",
        cluster: null,
        canonicalType: subcategoryAlias,
        subcategory: subcategoryAlias,
        confidence: 0.70,
        source: "subcategory_alias",
        flaggedForReview: false,
        conflictsResolved: [],
      };
    }

    // No match in CANONICAL_PATH_MAP, VERTICAL_ALIASES, or SUBCATEGORY_ALIASES.
    // Flag for review — unknown inputs must NOT silently pass through.
    return this._unknown(rawInput);
  }

  /**
   * Resolves vertical only (fast-path, no cluster/type needed).
   */
  resolveVertical(raw: string | null | undefined): Vertical {
    if (!raw) return "services";
    const normalized = raw.toLowerCase().trim();
    if (CONFLICT_OVERRIDES[normalized]) return CONFLICT_OVERRIDES[normalized];
    return normalizeVertical(raw);
  }

  /**
   * Resolves subcategory with strict validation against the unified registry.
   * Routes through CANONICAL_PATH_MAP (the authoritative allowed-subcategory set)
   * so that normalizeSubcategory()'s broader alias table cannot silently accept
   * strings that have no entry in the boundary guard's allowedSubcategories.
   * Returns null + flaggedForReview=true for any unknown or ambiguous input.
   */
  resolveSubcategory(raw: string | null | undefined): {
    subcategory: string | null;
    flaggedForReview: boolean;
    reason: string | null;
  } {
    if (!raw) return { subcategory: null, flaggedForReview: false, reason: null };
    const resolution = this.resolve(raw);
    if (resolution.flaggedForReview || !resolution.canonicalType) {
      return {
        subcategory: null,
        flaggedForReview: true,
        reason: `Unknown subcategory "${raw}" — not in unified taxonomy registry`,
      };
    }
    return { subcategory: resolution.canonicalType, flaggedForReview: false, reason: null };
  }

  private _unknown(raw: string): TaxonomyResolution {
    return {
      vertical: "services",
      cluster: null,
      canonicalType: null,
      subcategory: null,
      confidence: 0.10,
      source: "unknown",
      flaggedForReview: true,
      conflictsResolved: [],
    };
  }

  private _clusterFromCanonicalPath(key: string): string | null {
    return CANONICAL_PATH_MAP[key]?.cluster ?? null;
  }

  private _canonicalTypeFromPath(key: string): string | null {
    return CANONICAL_PATH_MAP[key]?.canonicalType ?? null;
  }

  private _inferVerticalFromSubcategory(sub: string): Vertical | null {
    const foodSubs = new Set(["cafe", "fast_food", "burger", "pizza", "sushi", "japanese", "chinese", "bakery", "desserts", "cloud_kitchen", "shawarma", "ice_cream"]);
    const healthSubs = new Set(["retail_pharmacy", "clinic", "dentist", "hospital", "physio", "veterinary"]);
    const staysSubs = new Set(["hotel", "resort", "boutique_hotel", "serviced_apartment", "holiday_home", "hostel", "desert_camp"]);
    const grocerySubs = new Set(["supermarket", "mini_mart", "organic_store", "hypermarket", "fruits_vegetables"]);

    if (foodSubs.has(sub)) return "food";
    if (healthSubs.has(sub)) return "healthcare";
    if (staysSubs.has(sub)) return "stay";
    if (grocerySubs.has(sub)) return "grocery";
    return null;
  }
}

export const taxonomyRegistry = TaxonomyRegistry.getInstance();

export function resolveCanonicalTaxonomy(raw: string | null | undefined): TaxonomyResolution {
  return taxonomyRegistry.resolve(raw);
}

export function resolveCanonicalVertical(raw: string | null | undefined): Vertical {
  return taxonomyRegistry.resolveVertical(raw);
}

export function resolveCanonicalSubcategory(raw: string | null | undefined): {
  subcategory: string | null;
  flaggedForReview: boolean;
  reason: string | null;
} {
  return taxonomyRegistry.resolveSubcategory(raw);
}
