/**
 * WORLD-CLASS TAXONOMY — Backward-compatible adapter.
 * =====================================================
 * DERIVES ALL DATA from the canonical category-tree.ts.
 * Adds enrichment layer (service modes, time relevance, geo hints, clusters)
 * that the canonical tree doesn't carry, for radar/discovery/search consumers.
 *
 * @deprecated For NEW code, import directly from @/lib/taxonomy/category-tree.
 */
import {
  CATEGORY_TREE,
  type PrimaryCategory,
  type CategorySubcategory,
  resolveSubcategory,
  getCategoryByVertical,
  getAllSubcategoryValues,
} from "@/lib/taxonomy/category-tree";

// ═══════════════════════════════════════════════════════════
//  RE-EXPORTED TYPES (backward compat)
// ═══════════════════════════════════════════════════════════

export type Vertical =
  | "food"
  | "grocery"
  | "shops"
  | "services"
  | "property"
  | "healthcare"
  | "mobility"
  | "experiences";

export type RadarMainCategory =
  | "all"
  | "food"
  | "grocery"
  | "shops"
  | "services"
  | "property";

export type ServiceMode =
  | "delivery"
  | "pickup"
  | "dine_in"
  | "home_service"
  | "onsite"
  | "virtual";

export type TimePeriod =
  | "breakfast"
  | "lunch"
  | "snack"
  | "dinner"
  | "late_night";

export interface TaxonomySubcategory {
  value: string;
  label: string;
  emoji: string;
  icon: string;
  cluster: string;
  tags: string[];
  serviceModes: ServiceMode[];
  timeRelevance: TimePeriod[];
  geoHints: string[];
}

export interface TaxonomyCluster {
  value: string;
  label: string;
  emoji: string;
}

export interface TaxonomyVertical {
  value: Vertical;
  label: string;
  emoji: string;
  radarCategory: RadarMainCategory;
  clusters: TaxonomyCluster[];
  subcategories: TaxonomySubcategory[];
}

// ═══════════════════════════════════════════════════════════
//  SERVICE MODE + TIME RELEVANCE ENRICHMENT
//  (derived from canonical category-tree architecture type)
// ═══════════════════════════════════════════════════════════

const SERVICE_MODE_ENRICHMENT: Record<string, ServiceMode[]> = {
  // Food subs
  restaurant: ["delivery", "pickup", "dine_in"],
  fast_food: ["delivery", "pickup", "dine_in"],
  pizza: ["delivery", "pickup", "dine_in"],
  burger: ["delivery", "pickup", "dine_in"],
  fried_chicken: ["delivery", "pickup", "dine_in"],
  shawarma: ["delivery", "pickup", "dine_in"],
  sushi: ["delivery", "pickup", "dine_in"],
  cafe: ["pickup", "dine_in", "delivery"],
  coffee: ["pickup", "dine_in"],
  bakery: ["pickup", "delivery", "dine_in"],
  desserts: ["pickup", "delivery", "dine_in"],
  beverages: ["pickup", "delivery"],
  breakfast: ["delivery", "pickup", "dine_in"],
  brunch: ["dine_in"],
  catering: ["home_service"],
  // Grocery subs
  supermarket: ["delivery", "pickup"],
  mini_mart: ["delivery", "pickup"],
  organic_store: ["delivery", "pickup"],
  fruits_vegetables: ["delivery", "pickup"],
  butcher: ["delivery", "pickup"],
  dairy: ["delivery", "pickup"],
  beverages_store: ["delivery", "pickup"],
  snacks: ["delivery", "pickup"],
  // Services/beauty subs
  cleaning: ["home_service", "onsite"],
  laundry: ["pickup", "delivery", "onsite"],
  handyman: ["home_service", "onsite"],
  plumbing: ["home_service", "onsite"],
  electrical: ["home_service", "onsite"],
  ac_repair: ["home_service", "onsite"],
  mobile_repair: ["onsite"],
  car_repair: ["onsite"],
  car_wash: ["onsite", "home_service"],
  salon: ["onsite"],
  barber: ["onsite"],
  spa: ["onsite"],
  beauty: ["onsite", "home_service"],
  movers: ["home_service"],
  pest_control: ["home_service"],
  tailoring: ["onsite"],
  printing: ["onsite"],
  tutoring: ["onsite", "virtual"],
  legal: ["onsite", "virtual"],
  // Property/stays
  hotel: ["onsite"],
  resort: ["onsite"],
  serviced_apartment: ["onsite"],
  hostel: ["onsite"],
};

const TIME_RELEVANCE_ENRICHMENT: Record<string, TimePeriod[]> = {
  restaurant: ["lunch", "dinner"],
  fast_food: ["lunch", "dinner", "late_night"],
  pizza: ["lunch", "dinner", "late_night"],
  burger: ["lunch", "dinner", "late_night"],
  fried_chicken: ["lunch", "dinner", "late_night"],
  shawarma: ["lunch", "dinner", "late_night"],
  cafe: ["breakfast", "snack"],
  coffee: ["breakfast", "snack"],
  bakery: ["breakfast", "snack"],
  desserts: ["snack", "dinner", "late_night"],
  breakfast: ["breakfast"],
  brunch: ["breakfast", "lunch"],
  sushi: ["lunch", "dinner"],
  beverages: ["snack"],
};

// ═══════════════════════════════════════════════════════════
//  MAP category-tree → Vertical
// ═══════════════════════════════════════════════════════════

function mapCategoryKeyToVertical(key: string): Vertical {
  const mapping: Record<string, Vertical> = {
    food: "food",
    grocery: "grocery",
    shops: "shops",
    services: "services",
    pharmacy: "healthcare",
    beauty: "services",
    taxi: "mobility",
    delivery: "mobility",
    property: "property",
    travel: "experiences",
  };
  return mapping[key] ?? "services";
}

function mapVerticalToRadar(vertical: Vertical): RadarMainCategory {
  const map: Record<Vertical, RadarMainCategory> = {
    food: "food",
    grocery: "grocery",
    shops: "shops",
    services: "services",
    property: "property",
    healthcare: "services",
    mobility: "services",
    experiences: "services",
  };
  return map[vertical] ?? "services";
}

function enrichSub(sub: CategorySubcategory): TaxonomySubcategory {
  return {
    value: sub.value,
    label: sub.label,
    emoji: sub.emoji,
    icon: sub.emoji,
    cluster: sub.cluster,
    tags: sub.tags ?? [],
    serviceModes: SERVICE_MODE_ENRICHMENT[sub.value] ?? [],
    timeRelevance: TIME_RELEVANCE_ENRICHMENT[sub.value] ?? [],
    geoHints: [],
  };
}

function extractClusters(subs: CategorySubcategory[]): TaxonomyCluster[] {
  const seen = new Map<string, TaxonomyCluster>();
  for (const s of subs) {
    if (!seen.has(s.cluster)) {
      seen.set(s.cluster, { value: s.cluster, label: s.cluster.charAt(0).toUpperCase() + s.cluster.slice(1).replace(/_/g, " "), emoji: s.emoji });
    }
  }
  return [...seen.values()];
}

// ═══════════════════════════════════════════════════════════
//  BUILD WORLD_TAXONOMY FROM CATEGORY_TREE
// ═══════════════════════════════════════════════════════════

function buildWorldTaxonomy(): TaxonomyVertical[] {
  // Group category-tree primaries by target vertical
  const verticalGroups = new Map<Vertical, PrimaryCategory[]>();
  for (const primary of CATEGORY_TREE) {
    const v = mapCategoryKeyToVertical(primary.key);
    const arr = verticalGroups.get(v) ?? [];
    arr.push(primary);
    verticalGroups.set(v, arr);
  }

  const result: TaxonomyVertical[] = [];
  for (const [vertical, primaries] of verticalGroups) {
    const allSubs = primaries.flatMap(p => p.subcategories);
    // Deduplicate subcategories by value
    const uniqueSubs = new Map<string, CategorySubcategory>();
    for (const s of allSubs) {
      if (!uniqueSubs.has(s.value)) uniqueSubs.set(s.value, s);
    }
    const enrichedSubs = [...uniqueSubs.values()].map(enrichSub);
    const clusters = extractClusters([...uniqueSubs.values()]);

    result.push({
      value: vertical,
      label: primaries[0].label,
      emoji: primaries[0].emoji,
      radarCategory: mapVerticalToRadar(vertical),
      clusters,
      subcategories: enrichedSubs,
    });
  }
  return result;
}

export const WORLD_TAXONOMY: TaxonomyVertical[] = buildWorldTaxonomy();

// ═══════════════════════════════════════════════════════════
//  EXPORTS & ALIASES
// ═══════════════════════════════════════════════════════════
export const CANONICAL_VERTICALS = WORLD_TAXONOMY;
export const VERTICALS = WORLD_TAXONOMY;

// ═══════════════════════════════════════════════════════════
//  RADAR CATEGORIES
// ═══════════════════════════════════════════════════════════
export const RADAR_CATEGORIES: { value: RadarMainCategory; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "✨" },
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "grocery", label: "Grocery", emoji: "🛒" },
  { value: "shops", label: "Shops", emoji: "🛍️" },
  { value: "services", label: "Services", emoji: "🛠️" },
  { value: "property", label: "Property", emoji: "🏠" },
];

// ═══════════════════════════════════════════════════════════
//  NORMALIZATION (aliases for classification/import)
// ═══════════════════════════════════════════════════════════

const ALL_SUBS = new Set(
  CANONICAL_VERTICALS.flatMap((v) => v.subcategories.map((s) => s.value))
);

const VERTICAL_ALIASES: Record<string, Vertical> = {
  food: "food",
  restaurant: "food",
  dining: "food",
  cafe: "food",
  grocery: "grocery",
  supermarket: "grocery",
  market: "grocery",
  shops: "shops",
  retail: "shops",
  services: "services",
  home_services: "services",
  property: "property",
  real_estate: "property",
  realestate: "property",
  healthcare: "healthcare",
  health: "healthcare",
  pharmacy: "healthcare",
  mobility: "mobility",
  transport: "mobility",
  experiences: "experiences",
  activities: "experiences",
  travel: "experiences",
};

const SUBCATEGORY_ALIASES: Record<string, string> = {
  "fast food": "fast_food",
  fastfood: "fast_food",
  "fried chicken": "fried_chicken",
  "lounge cafe": "lounge_cafe",
  "cafe lounge": "lounge_cafe",
  "coffee shop": "cafe",
  "ice cream": "desserts",
  repair: "handyman",
  maintenance: "handyman",
  "phone repair": "mobile_repair",
  "mobile repair": "mobile_repair",
  "tech repair": "electronics_repair",
  "auto repair": "car_repair",
  moving: "movers",
  "mini mart": "mini_mart",
  "organic store": "organic_store",
  fruits: "fruits_vegetables",
  vegetables: "fruits_vegetables",
  beverages: "beverages_store",
  commercial: "commercial_space",
  "short stay": "short_stay",
  ac_repair: "ac_repair",
  car_wash: "car_wash",
  shawarma: "shawarma",
  pasta: "pasta",
  "wraps & shawarma": "shawarma",
  "personal services": "beauty",
  organic: "organic_store",
  "cheese butter": "dairy",
  "cheese & butter": "dairy",
  hotel: "hotel",
  hotels: "hotel",
  resort: "resort",
  resorts: "resort",
  "serviced apartment": "serviced_apartment",
  "serviced apartments": "serviced_apartment",
  "apart hotel": "serviced_apartment",
  hostel: "hostel",
  hostels: "hostel",
  accommodation: "hotel",
  lodging: "hotel",
  "vacation rental": "short_stay",
  "holiday home": "short_stay",
};

export function normalizeVertical(raw?: string | null): Vertical {
  if (!raw) return "services";
  const key = raw.toLowerCase().trim();
  return VERTICAL_ALIASES[key] ?? "services";
}

export function normalizeSubcategory(raw?: string | null): string | null {
  if (!raw) return null;
  const rawKey = raw.toLowerCase().trim();
  const cleanKey = rawKey.replace(/[\s-]+/g, "_");
  if (ALL_SUBS.has(cleanKey)) return cleanKey;
  const alias = SUBCATEGORY_ALIASES[rawKey] ?? SUBCATEGORY_ALIASES[cleanKey];
  if (alias) return alias;
  return cleanKey;
}

export function verticalToRadarCategory(vertical: string): RadarMainCategory {
  const norm = normalizeVertical(vertical);
  const found = CANONICAL_VERTICALS.find((v) => v.value === norm);
  return found?.radarCategory ?? "shops";
}

// ═══════════════════════════════════════════════════════════
//  LOOKUP HELPERS
// ═══════════════════════════════════════════════════════════

export function getCanonicalVertical(value: string) {
  const norm = normalizeVertical(value);
  return CANONICAL_VERTICALS.find((v) => v.value === norm);
}

export function getCanonicalSubcategory(value: string) {
  const norm = normalizeSubcategory(value);
  if (!norm) return undefined;
  for (const vertical of CANONICAL_VERTICALS) {
    const found = vertical.subcategories.find((s) => s.value === norm);
    if (found) return found;
  }
  return undefined;
}

export function getParentVertical(subValue: string) {
  const norm = normalizeSubcategory(subValue);
  if (!norm) return undefined;
  return CANONICAL_VERTICALS.find((v) =>
    v.subcategories.some((s) => s.value === norm)
  );
}

export function getSubcategoriesForRadarCategory(
  cat: RadarMainCategory
): TaxonomySubcategory[] {
  if (cat === "all") return [];
  return CANONICAL_VERTICALS
    .filter((v) => v.radarCategory === cat)
    .flatMap((v) => v.subcategories);
}

export function getClustersForVertical(vertical: string): TaxonomyCluster[] {
  const found = getCanonicalVertical(vertical);
  return found?.clusters ?? [];
}

export function getSubcategoriesForVertical(vertical: string): TaxonomySubcategory[] {
  const found = getCanonicalVertical(vertical);
  return found?.subcategories ?? [];
}

export function getSubcategoriesForCluster(
  vertical: string,
  cluster: string
): TaxonomySubcategory[] {
  const found = getCanonicalVertical(vertical);
  if (!found) return [];
  return found.subcategories.filter((s) => s.cluster === cluster);
}

export const ALL_SUBCATEGORY_VALUES = [...ALL_SUBS];

// ═══════════════════════════════════════════════════════════
//  DEEP HIERARCHY HELPERS
// ═══════════════════════════════════════════════════════════

export function hierarchyMatchScore(
  pointSub: string | null | undefined,
  targetSub?: string | null,
  targetVertical?: string | null
): number {
  if (!pointSub) return 0;
  const normPoint = normalizeSubcategory(pointSub);
  if (!normPoint) return 0;

  if (targetSub) {
    const normTarget = normalizeSubcategory(targetSub);
    if (normPoint === normTarget) return 3;
  }

  const pointVertical = getParentVertical(normPoint);
  if (!pointVertical) return 0;

  if (targetSub) {
    const normTarget = normalizeSubcategory(targetSub);
    if (normTarget) {
      const targetInfo = pointVertical.subcategories.find((s) => s.value === normTarget);
      const pointInfo = pointVertical.subcategories.find((s) => s.value === normPoint);
      if (targetInfo && pointInfo && targetInfo.cluster === pointInfo.cluster) return 2;
    }
  }

  if (targetVertical) {
    const normVert = normalizeVertical(targetVertical);
    if (pointVertical.value === normVert) return 1;
  }

  return 0;
}

export function getClusterForSubcategory(subValue: string): string | null {
  const norm = normalizeSubcategory(subValue);
  if (!norm) return null;
  for (const v of CANONICAL_VERTICALS) {
    const found = v.subcategories.find((s) => s.value === norm);
    if (found) return found.cluster;
  }
  return null;
}
