/**
 * TAXONOMY CONFIG REGISTRY — Taxonomy-driven configuration for UI, Radar, Cards, Import.
 * =========================================================================================
 * Single registry that maps Family → Category → Subcategory to:
 *   - UI config (card layout, filters, badges, display rules)
 *   - Radar config (layer type, icon, clustering, animation)
 *   - Import config (source mapping, parsing, enrichment)
 *   - Card config (micro-component composition)
 *
 * ALL modules MUST consume this registry instead of hardcoding per-vertical logic.
 */

import { CATEGORY_TREE, type PrimaryCategory, resolveSubcategory } from "./category-tree";
import {
  normalizeVertical,
  normalizeSubcategory,
  type Vertical,
} from "./world-class-taxonomy";

// ═══════════════════════════════════════════════════════════
//  UI CONFIG — per vertical/subcategory
// ═══════════════════════════════════════════════════════════

export interface TaxonomyUIConfig {
  cardLayout: "menu" | "catalog" | "listing" | "booking" | "mobility";
  showRating: boolean;
  showDistance: boolean;
  showPrice: boolean;
  showDeliveryBadge: boolean;
  showTimeBadge: boolean;
  showCuisineBadge: boolean;
  filterGroups: string[];
  sortOptions: string[];
  heroStyle: "image" | "gradient" | "map";
}

// ═══════════════════════════════════════════════════════════
//  RADAR CONFIG — per vertical/subcategory
// ═══════════════════════════════════════════════════════════

export interface TaxonomyRadarConfig {
  layerType: "pin" | "cluster" | "heatmap" | "route";
  iconEmoji: string;
  clusterRadius: number;
  animationStyle: "bounce" | "pulse" | "fade" | "none";
  priorityWeight: number;
  showInRadar: boolean;
}

// ═══════════════════════════════════════════════════════════
//  CARD CONFIG — micro-component composition
// ═══════════════════════════════════════════════════════════

export interface TaxonomyCardConfig {
  showMedia: boolean;
  showIdentity: boolean;
  showSignals: boolean;
  showCommerce: boolean;
  showLocation: boolean;
  showActions: boolean;
  signalBadges: string[];
  commerceLabel: string;
  actionButtons: string[];
}

// ═══════════════════════════════════════════════════════════
//  IMPORT CONFIG — per vertical/source
// ═══════════════════════════════════════════════════════════

export interface TaxonomyImportConfig {
  requiredFields: string[];
  optionalFields: string[];
  enrichmentSteps: string[];
  qualityThreshold: number;
  dedupeStrategy: "name_geo" | "phone" | "url" | "composite";
}

// ═══════════════════════════════════════════════════════════
//  COMBINED NODE CONFIG
// ═══════════════════════════════════════════════════════════

export interface TaxonomyNodeConfig {
  key: string;
  vertical: Vertical;
  label: string;
  emoji: string;
  ui: TaxonomyUIConfig;
  radar: TaxonomyRadarConfig;
  card: TaxonomyCardConfig;
  import: TaxonomyImportConfig;
}

// ═══════════════════════════════════════════════════════════
//  DEFAULT CONFIGS BY ARCHITECTURE TYPE
// ═══════════════════════════════════════════════════════════

const UI_DEFAULTS: Record<string, TaxonomyUIConfig> = {
  menu: {
    cardLayout: "menu", showRating: true, showDistance: true, showPrice: true,
    showDeliveryBadge: true, showTimeBadge: true, showCuisineBadge: true,
    filterGroups: ["cuisine", "price_range", "delivery_time", "rating"],
    sortOptions: ["smart", "nearest", "best_rated", "fastest"],
    heroStyle: "image",
  },
  catalog: {
    cardLayout: "catalog", showRating: true, showDistance: true, showPrice: true,
    showDeliveryBadge: true, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["category", "price_range", "brand"],
    sortOptions: ["smart", "nearest", "best_rated", "price_low"],
    heroStyle: "image",
  },
  catalog_parcel: {
    cardLayout: "catalog", showRating: true, showDistance: true, showPrice: true,
    showDeliveryBadge: true, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["category", "price_range", "brand", "mall"],
    sortOptions: ["smart", "nearest", "best_rated", "trending"],
    heroStyle: "image",
  },
  booking: {
    cardLayout: "booking", showRating: true, showDistance: true, showPrice: true,
    showDeliveryBadge: false, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["service_type", "price_range", "availability"],
    sortOptions: ["smart", "nearest", "best_rated"],
    heroStyle: "gradient",
  },
  medical_catalog: {
    cardLayout: "catalog", showRating: true, showDistance: true, showPrice: true,
    showDeliveryBadge: true, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["category", "availability"],
    sortOptions: ["nearest", "best_rated"],
    heroStyle: "gradient",
  },
  listing: {
    cardLayout: "listing", showRating: false, showDistance: true, showPrice: true,
    showDeliveryBadge: false, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["property_type", "price_range", "bedrooms", "area"],
    sortOptions: ["smart", "price_low", "price_high", "newest"],
    heroStyle: "map",
  },
  calendar_booking: {
    cardLayout: "booking", showRating: true, showDistance: false, showPrice: true,
    showDeliveryBadge: false, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["accommodation_type", "price_range", "amenities"],
    sortOptions: ["smart", "price_low", "best_rated"],
    heroStyle: "image",
  },
  mobility_taxi: {
    cardLayout: "mobility", showRating: true, showDistance: false, showPrice: true,
    showDeliveryBadge: false, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["vehicle_type"],
    sortOptions: ["nearest", "price_low"],
    heroStyle: "map",
  },
  mobility_delivery: {
    cardLayout: "mobility", showRating: false, showDistance: false, showPrice: true,
    showDeliveryBadge: false, showTimeBadge: false, showCuisineBadge: false,
    filterGroups: ["parcel_size"],
    sortOptions: ["fastest", "price_low"],
    heroStyle: "map",
  },
};

const RADAR_DEFAULTS: Record<string, TaxonomyRadarConfig> = {
  menu:              { layerType: "cluster", iconEmoji: "🍽️", clusterRadius: 60, animationStyle: "pulse",  priorityWeight: 1.0, showInRadar: true },
  catalog:           { layerType: "cluster", iconEmoji: "🛒", clusterRadius: 80, animationStyle: "fade",   priorityWeight: 0.8, showInRadar: true },
  catalog_parcel:    { layerType: "cluster", iconEmoji: "🛍️", clusterRadius: 80, animationStyle: "fade",   priorityWeight: 0.8, showInRadar: true },
  booking:           { layerType: "pin",     iconEmoji: "🔧", clusterRadius: 50, animationStyle: "bounce", priorityWeight: 0.7, showInRadar: true },
  medical_catalog:   { layerType: "pin",     iconEmoji: "💊", clusterRadius: 50, animationStyle: "none",   priorityWeight: 0.9, showInRadar: true },
  listing:           { layerType: "pin",     iconEmoji: "🏠", clusterRadius: 40, animationStyle: "none",   priorityWeight: 0.6, showInRadar: true },
  calendar_booking:  { layerType: "pin",     iconEmoji: "🏨", clusterRadius: 40, animationStyle: "none",   priorityWeight: 0.7, showInRadar: true },
  mobility_taxi:     { layerType: "route",   iconEmoji: "🚕", clusterRadius: 0,  animationStyle: "pulse",  priorityWeight: 1.0, showInRadar: true },
  mobility_delivery: { layerType: "route",   iconEmoji: "🚚", clusterRadius: 0,  animationStyle: "pulse",  priorityWeight: 1.0, showInRadar: true },
};

const CARD_DEFAULTS: Record<string, TaxonomyCardConfig> = {
  menu:              { showMedia: true, showIdentity: true, showSignals: true, showCommerce: true, showLocation: true, showActions: true, signalBadges: ["rating", "delivery_time", "cuisine"], commerceLabel: "Order", actionButtons: ["order", "favorite"] },
  catalog:           { showMedia: true, showIdentity: true, showSignals: true, showCommerce: true, showLocation: true, showActions: true, signalBadges: ["rating", "stock"],                  commerceLabel: "Shop",  actionButtons: ["shop", "favorite"] },
  catalog_parcel:    { showMedia: true, showIdentity: true, showSignals: true, showCommerce: true, showLocation: true, showActions: true, signalBadges: ["rating", "delivery"],               commerceLabel: "Shop",  actionButtons: ["shop", "favorite"] },
  booking:           { showMedia: true, showIdentity: true, showSignals: true, showCommerce: true, showLocation: true, showActions: true, signalBadges: ["rating", "availability"],            commerceLabel: "Book",  actionButtons: ["book", "call"] },
  medical_catalog:   { showMedia: true, showIdentity: true, showSignals: true, showCommerce: true, showLocation: true, showActions: true, signalBadges: ["open_now"],                         commerceLabel: "Order", actionButtons: ["order", "call"] },
  listing:           { showMedia: true, showIdentity: true, showSignals: false, showCommerce: true, showLocation: true, showActions: true, signalBadges: [],                                   commerceLabel: "View",  actionButtons: ["inquire", "favorite"] },
  calendar_booking:  { showMedia: true, showIdentity: true, showSignals: true, showCommerce: true, showLocation: false, showActions: true, signalBadges: ["rating", "amenities"],              commerceLabel: "Book",  actionButtons: ["book", "favorite"] },
  mobility_taxi:     { showMedia: false, showIdentity: true, showSignals: false, showCommerce: true, showLocation: false, showActions: true, signalBadges: [],                                  commerceLabel: "Ride",  actionButtons: ["book"] },
  mobility_delivery: { showMedia: false, showIdentity: false, showSignals: false, showCommerce: true, showLocation: false, showActions: true, signalBadges: [],                                 commerceLabel: "Send",  actionButtons: ["send"] },
};

const IMPORT_DEFAULTS: Record<string, TaxonomyImportConfig> = {
  menu:              { requiredFields: ["name", "category"], optionalFields: ["menu", "hours", "phone"], enrichmentSteps: ["menu_parse", "hours_extract", "photo_score"], qualityThreshold: 40, dedupeStrategy: "name_geo" },
  catalog:           { requiredFields: ["name", "category"], optionalFields: ["products", "phone"],      enrichmentSteps: ["catalog_parse", "photo_score"],               qualityThreshold: 35, dedupeStrategy: "name_geo" },
  catalog_parcel:    { requiredFields: ["name", "category"], optionalFields: ["products", "phone"],      enrichmentSteps: ["catalog_parse", "photo_score"],               qualityThreshold: 35, dedupeStrategy: "name_geo" },
  booking:           { requiredFields: ["name", "category"], optionalFields: ["services", "phone"],      enrichmentSteps: ["service_parse"],                              qualityThreshold: 30, dedupeStrategy: "name_geo" },
  medical_catalog:   { requiredFields: ["name", "license"],  optionalFields: ["products", "phone"],      enrichmentSteps: ["license_verify", "catalog_parse"],            qualityThreshold: 50, dedupeStrategy: "name_geo" },
  listing:           { requiredFields: ["name", "address"],  optionalFields: ["price", "bedrooms"],      enrichmentSteps: ["geo_resolve", "photo_score"],                 qualityThreshold: 30, dedupeStrategy: "composite" },
  calendar_booking:  { requiredFields: ["name", "address"],  optionalFields: ["rooms", "amenities"],     enrichmentSteps: ["room_parse", "photo_score"],                  qualityThreshold: 40, dedupeStrategy: "name_geo" },
  mobility_taxi:     { requiredFields: ["name", "license"],  optionalFields: ["vehicle_type"],            enrichmentSteps: ["license_verify"],                             qualityThreshold: 60, dedupeStrategy: "phone" },
  mobility_delivery: { requiredFields: ["name"],             optionalFields: ["vehicle_type"],            enrichmentSteps: [],                                             qualityThreshold: 30, dedupeStrategy: "phone" },
};

// ═══════════════════════════════════════════════════════════
//  SUBCATEGORY OVERRIDES (granular per-subcategory config)
// ═══════════════════════════════════════════════════════════

const SUBCATEGORY_RADAR_OVERRIDES: Record<string, Partial<TaxonomyRadarConfig>> = {
  pizza:          { iconEmoji: "🍕", animationStyle: "bounce" },
  burger:         { iconEmoji: "🍔" },
  sushi:          { iconEmoji: "🍣" },
  cafe:           { iconEmoji: "☕" },
  coffee:         { iconEmoji: "☕" },
  bakery:         { iconEmoji: "🥐" },
  shawarma:       { iconEmoji: "🌯" },
  pharmacy:       { iconEmoji: "💊" },
  salon:          { iconEmoji: "💇‍♀️" },
  hotel:          { iconEmoji: "🏨" },
  resort:         { iconEmoji: "🏖️" },
  taxi:           { iconEmoji: "🚕" },
  supermarket:    { iconEmoji: "🏬" },
  fashion:        { iconEmoji: "👗" },
  electronics:    { iconEmoji: "📱" },
  cleaning:       { iconEmoji: "🧼" },
  rent_apartment: { iconEmoji: "🏢" },
  sale_villa:     { iconEmoji: "🏡" },
};

const SUBCATEGORY_CARD_OVERRIDES: Record<string, Partial<TaxonomyCardConfig>> = {
  pizza:     { signalBadges: ["rating", "delivery_time", "popular"] },
  burger:    { signalBadges: ["rating", "delivery_time", "popular"] },
  cafe:      { signalBadges: ["rating", "open_now"] },
  hotel:     { signalBadges: ["rating", "amenities", "price_range"], actionButtons: ["book", "favorite", "compare"] },
  salon:     { signalBadges: ["rating", "availability"], actionButtons: ["book", "call"] },
};

// ═══════════════════════════════════════════════════════════
//  REGISTRY BUILD + LOOKUP
// ═══════════════════════════════════════════════════════════

const _configCache = new Map<string, TaxonomyNodeConfig>();

function buildNodeConfig(primary: PrimaryCategory, subValue?: string): TaxonomyNodeConfig {
  const arch = primary.architecture;
  const vertical = normalizeVertical(primary.vertical);

  const ui = { ...UI_DEFAULTS[arch] } as TaxonomyUIConfig;
  const radar: TaxonomyRadarConfig = {
    ...RADAR_DEFAULTS[arch],
    ...(subValue ? SUBCATEGORY_RADAR_OVERRIDES[subValue] : {}),
  };
  const card: TaxonomyCardConfig = {
    ...CARD_DEFAULTS[arch],
    ...(subValue ? SUBCATEGORY_CARD_OVERRIDES[subValue] : {}),
  };
  const imp = { ...IMPORT_DEFAULTS[arch] } as TaxonomyImportConfig;

  const sub = subValue
    ? primary.subcategories.find((s) => s.value === subValue)
    : undefined;

  return {
    key: subValue || primary.key,
    vertical,
    label: sub?.label || primary.label,
    emoji: sub?.emoji || primary.emoji,
    ui,
    radar,
    card,
    import: imp,
  };
}

/**
 * Resolve full taxonomy config for a vertical + optional subcategory.
 * Returns merged config with subcategory overrides applied.
 */
export function resolveTaxonomyConfig(
  vertical?: string | null,
  subcategory?: string | null,
): TaxonomyNodeConfig {
  const normVert = normalizeVertical(vertical);
  const normSub = subcategory ? normalizeSubcategory(subcategory) : null;
  const cacheKey = `${normVert}:${normSub || ""}`;

  const cached = _configCache.get(cacheKey);
  if (cached) return cached;

  // Try to resolve from subcategory first
  if (normSub) {
    const resolved = resolveSubcategory(normSub);
    if (resolved) {
      const config = buildNodeConfig(resolved.primary, normSub);
      _configCache.set(cacheKey, config);
      return config;
    }
  }

  // Fallback to vertical-level config
  const primary = CATEGORY_TREE.find((c) => c.vertical === normVert || c.key === normVert);
  if (primary) {
    const config = buildNodeConfig(primary);
    _configCache.set(cacheKey, config);
    return config;
  }

  // Ultimate fallback
  const fallback = buildNodeConfig(CATEGORY_TREE[0]);
  _configCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Get UI config for a vertical + subcategory.
 */
export function getTaxonomyUIConfig(vertical?: string | null, subcategory?: string | null): TaxonomyUIConfig {
  return resolveTaxonomyConfig(vertical, subcategory).ui;
}

/**
 * Get radar config for a vertical + subcategory.
 */
export function getTaxonomyRadarConfig(vertical?: string | null, subcategory?: string | null): TaxonomyRadarConfig {
  return resolveTaxonomyConfig(vertical, subcategory).radar;
}

/**
 * Get card config for a vertical + subcategory.
 */
export function getTaxonomyCardConfig(vertical?: string | null, subcategory?: string | null): TaxonomyCardConfig {
  return resolveTaxonomyConfig(vertical, subcategory).card;
}

/**
 * Get import config for a vertical + subcategory.
 */
export function getTaxonomyImportConfig(vertical?: string | null, subcategory?: string | null): TaxonomyImportConfig {
  return resolveTaxonomyConfig(vertical, subcategory).import;
}
