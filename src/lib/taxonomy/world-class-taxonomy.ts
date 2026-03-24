/**
 * WORLD-CLASS TAXONOMY — Single Source of Truth
 * ==============================================
 * Every screen, store, filter, map, radar, search, import, and hub MUST use this file.
 * No other category/subcategory definitions should exist.
 */

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

function sub(def: Partial<TaxonomySubcategory> & Pick<TaxonomySubcategory, "value" | "label" | "emoji" | "cluster">): TaxonomySubcategory {
  return {
    icon: def.emoji,
    tags: [],
    serviceModes: [],
    timeRelevance: [],
    geoHints: [],
    ...def,
  };
}

// ═══════════════════════════════════════════════════════════
//  WORLD TAXONOMY
// ═══════════════════════════════════════════════════════════

export const WORLD_TAXONOMY: TaxonomyVertical[] = [
  // ─── FOOD ─────────────────────────────────────────────────
  {
    value: "food",
    label: "Food",
    emoji: "🍽️",
    radarCategory: "food",
    clusters: [
      { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
      { value: "fast_food", label: "Fast Food", emoji: "🍔" },
      { value: "cafe", label: "Cafe", emoji: "☕" },
      { value: "bakery", label: "Bakery", emoji: "🥐" },
      { value: "desserts", label: "Desserts", emoji: "🍰" },
      { value: "cuisine", label: "Cuisine", emoji: "🍜" },
    ],
    subcategories: [
      sub({ value: "restaurant", label: "Restaurant", emoji: "🍽️", cluster: "restaurant", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "fast_food", label: "Fast Food", emoji: "🍔", cluster: "fast_food", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner", "late_night"] }),
      sub({ value: "pizza", label: "Pizza", emoji: "🍕", cluster: "cuisine", tags: ["italian", "delivery", "family"], serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner", "late_night"] }),
      sub({ value: "burger", label: "Burger", emoji: "🍔", cluster: "fast_food", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner", "late_night"] }),
      sub({ value: "fried_chicken", label: "Fried Chicken", emoji: "🍗", cluster: "fast_food", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner", "late_night"] }),
      sub({ value: "cafe", label: "Cafe", emoji: "☕", cluster: "cafe", serviceModes: ["pickup", "dine_in", "delivery"], timeRelevance: ["breakfast", "snack"] }),
      sub({ value: "lounge_cafe", label: "Lounge Cafe", emoji: "🫖", cluster: "cafe", serviceModes: ["dine_in"], timeRelevance: ["snack", "dinner", "late_night"] }),
      sub({ value: "bakery", label: "Bakery", emoji: "🥐", cluster: "bakery", serviceModes: ["pickup", "delivery", "dine_in"], timeRelevance: ["breakfast", "snack"] }),
      sub({ value: "desserts", label: "Desserts", emoji: "🍰", cluster: "desserts", serviceModes: ["pickup", "delivery", "dine_in"], timeRelevance: ["snack", "dinner", "late_night"] }),
      sub({ value: "italian", label: "Italian", emoji: "🍝", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "japanese", label: "Japanese", emoji: "🍣", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "sushi", label: "Sushi", emoji: "🍣", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "indian", label: "Indian", emoji: "🍛", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "chinese", label: "Chinese", emoji: "🥡", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "lebanese", label: "Lebanese", emoji: "🥙", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "healthy", label: "Healthy", emoji: "🥗", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["breakfast", "lunch", "snack"] }),
      sub({ value: "breakfast", label: "Breakfast", emoji: "🍳", cluster: "restaurant", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["breakfast"] }),
      sub({ value: "seafood", label: "Seafood", emoji: "🦞", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "shawarma", label: "Shawarma", emoji: "🌯", cluster: "fast_food", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner", "late_night"] }),
      sub({ value: "pasta", label: "Pasta", emoji: "🍝", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "coffee", label: "Coffee", emoji: "☕", cluster: "cafe", serviceModes: ["pickup", "dine_in"], timeRelevance: ["breakfast", "snack"] }),
      sub({ value: "beverages", label: "Beverages", emoji: "🥤", cluster: "cafe", serviceModes: ["pickup", "delivery"], timeRelevance: ["snack"] }),
      sub({ value: "brunch", label: "Brunch", emoji: "🥂", cluster: "restaurant", serviceModes: ["dine_in"], timeRelevance: ["breakfast", "lunch"] }),
      sub({ value: "arabic", label: "Arabic", emoji: "🧆", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "turkish", label: "Turkish", emoji: "🥘", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "asian", label: "Asian Fusion", emoji: "🍜", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "mexican", label: "Mexican", emoji: "🌮", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "thai", label: "Thai", emoji: "🍜", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "korean", label: "Korean", emoji: "🍱", cluster: "cuisine", serviceModes: ["delivery", "pickup", "dine_in"], timeRelevance: ["lunch", "dinner"] }),
      sub({ value: "catering", label: "Catering", emoji: "🍴", cluster: "restaurant", serviceModes: ["home_service"], timeRelevance: [] }),
      sub({ value: "private_chef", label: "Private Chef", emoji: "👨‍🍳", cluster: "restaurant", serviceModes: ["home_service"], timeRelevance: ["dinner"] }),
    ],
  },

  // ─── GROCERY ──────────────────────────────────────────────
  {
    value: "grocery",
    label: "Grocery",
    emoji: "🛒",
    radarCategory: "grocery",
    clusters: [
      { value: "market", label: "Market", emoji: "🛒" },
      { value: "fresh", label: "Fresh", emoji: "🥬" },
      { value: "specialty", label: "Specialty", emoji: "🥛" },
    ],
    subcategories: [
      sub({ value: "supermarket", label: "Supermarket", emoji: "🏬", cluster: "market", serviceModes: ["delivery", "pickup"] }),
      sub({ value: "mini_mart", label: "Mini Mart", emoji: "🏪", cluster: "market", serviceModes: ["delivery", "pickup"] }),
      sub({ value: "organic_store", label: "Organic Store", emoji: "🌿", cluster: "specialty", serviceModes: ["delivery", "pickup"] }),
      sub({ value: "fruits_vegetables", label: "Fruits & Vegetables", emoji: "🥬", cluster: "fresh", serviceModes: ["delivery", "pickup"] }),
      sub({ value: "butcher", label: "Butcher", emoji: "🥩", cluster: "fresh", serviceModes: ["delivery", "pickup"] }),
      sub({ value: "dairy", label: "Dairy", emoji: "🥛", cluster: "specialty", serviceModes: ["delivery", "pickup"] }),
      sub({ value: "beverages_store", label: "Beverages", emoji: "🥤", cluster: "specialty", serviceModes: ["delivery", "pickup"] }),
      sub({ value: "snacks", label: "Snacks", emoji: "🍿", cluster: "specialty", serviceModes: ["delivery", "pickup"] }),
    ],
  },

  // ─── SHOPS ────────────────────────────────────────────────
  {
    value: "shops",
    label: "Shops",
    emoji: "🛍️",
    radarCategory: "shops",
    clusters: [
      { value: "retail", label: "Retail", emoji: "🛍️" },
      { value: "specialty", label: "Specialty", emoji: "🎁" },
    ],
    subcategories: [
      sub({ value: "fashion", label: "Fashion", emoji: "👗", cluster: "retail" }),
      sub({ value: "electronics", label: "Electronics", emoji: "📱", cluster: "retail" }),
      sub({ value: "pharmacy", label: "Pharmacy", emoji: "💊", cluster: "specialty" }),
      sub({ value: "gifts", label: "Gifts", emoji: "🎁", cluster: "specialty" }),
      sub({ value: "pets", label: "Pets", emoji: "🐾", cluster: "specialty" }),
      sub({ value: "flowers", label: "Flowers", emoji: "💐", cluster: "specialty" }),
      sub({ value: "home_decor", label: "Home Decor", emoji: "🛋️", cluster: "retail" }),
      sub({ value: "accessories", label: "Accessories", emoji: "🕶️", cluster: "retail" }),
    ],
  },

  // ─── SERVICES ─────────────────────────────────────────────
  {
    value: "services",
    label: "Services",
    emoji: "🛠️",
    radarCategory: "services",
    clusters: [
      { value: "home", label: "Home", emoji: "🏠" },
      { value: "repair", label: "Repair", emoji: "🔧" },
      { value: "beauty", label: "Beauty", emoji: "💇" },
      { value: "professional", label: "Professional", emoji: "💼" },
    ],
    subcategories: [
      sub({ value: "cleaning", label: "Cleaning", emoji: "🧼", cluster: "home", serviceModes: ["home_service", "onsite"] }),
      sub({ value: "laundry", label: "Laundry", emoji: "🧺", cluster: "home", serviceModes: ["pickup", "delivery", "onsite"] }),
      sub({ value: "handyman", label: "Handyman", emoji: "🛠️", cluster: "repair", serviceModes: ["home_service", "onsite"] }),
      sub({ value: "plumbing", label: "Plumbing", emoji: "🚰", cluster: "repair", serviceModes: ["home_service", "onsite"] }),
      sub({ value: "electrical", label: "Electrical", emoji: "💡", cluster: "repair", serviceModes: ["home_service", "onsite"] }),
      sub({ value: "ac_repair", label: "AC Repair", emoji: "❄️", cluster: "repair", serviceModes: ["home_service", "onsite"] }),
      sub({ value: "mobile_repair", label: "Mobile Repair", emoji: "📱", cluster: "repair", serviceModes: ["onsite"] }),
      sub({ value: "electronics_repair", label: "Electronics Repair", emoji: "💻", cluster: "repair", serviceModes: ["onsite"] }),
      sub({ value: "car_repair", label: "Car Repair", emoji: "🚗", cluster: "repair", serviceModes: ["onsite"] }),
      sub({ value: "car_wash", label: "Car Wash", emoji: "🚘", cluster: "repair", serviceModes: ["onsite", "home_service"] }),
      sub({ value: "salon", label: "Salon", emoji: "💇‍♀️", cluster: "beauty", serviceModes: ["onsite"] }),
      sub({ value: "barber", label: "Barber", emoji: "💈", cluster: "beauty", serviceModes: ["onsite"] }),
      sub({ value: "spa", label: "Spa", emoji: "🧖", cluster: "beauty", serviceModes: ["onsite"] }),
      sub({ value: "beauty", label: "Beauty", emoji: "💄", cluster: "beauty", serviceModes: ["onsite", "home_service"] }),
      sub({ value: "movers", label: "Movers", emoji: "📦", cluster: "home", serviceModes: ["home_service"] }),
      sub({ value: "pest_control", label: "Pest Control", emoji: "🐜", cluster: "home", serviceModes: ["home_service"] }),
      sub({ value: "tailoring", label: "Tailoring", emoji: "🧵", cluster: "professional", serviceModes: ["onsite"] }),
      sub({ value: "printing", label: "Printing", emoji: "🖨️", cluster: "professional", serviceModes: ["onsite"] }),
      sub({ value: "tutoring", label: "Tutoring", emoji: "📚", cluster: "professional", serviceModes: ["onsite", "virtual"] }),
      sub({ value: "legal", label: "Legal", emoji: "⚖️", cluster: "professional", serviceModes: ["onsite", "virtual"] }),
    ],
  },

  // ─── PROPERTY ─────────────────────────────────────────────
  {
    value: "property",
    label: "Property",
    emoji: "🏠",
    radarCategory: "property",
    clusters: [
      { value: "residential", label: "Residential", emoji: "🏠" },
      { value: "commercial", label: "Commercial", emoji: "🏢" },
      { value: "hospitality", label: "Hospitality", emoji: "🏨" },
    ],
    subcategories: [
      sub({ value: "apartment", label: "Apartment", emoji: "🏢", cluster: "residential" }),
      sub({ value: "villa", label: "Villa", emoji: "🏡", cluster: "residential" }),
      sub({ value: "office", label: "Office", emoji: "🏢", cluster: "commercial" }),
      sub({ value: "warehouse", label: "Warehouse", emoji: "🏭", cluster: "commercial" }),
      sub({ value: "short_stay", label: "Short Stay", emoji: "🛏️", cluster: "residential" }),
      sub({ value: "commercial_space", label: "Commercial Space", emoji: "🏬", cluster: "commercial" }),
      sub({ value: "hotel", label: "Hotel", emoji: "🏨", cluster: "hospitality", tags: ["accommodation", "travel", "stay"], serviceModes: ["onsite"], timeRelevance: [] }),
      sub({ value: "resort", label: "Resort", emoji: "🏖️", cluster: "hospitality", tags: ["luxury", "vacation", "beach"], serviceModes: ["onsite"], timeRelevance: [] }),
      sub({ value: "serviced_apartment", label: "Serviced Apartment", emoji: "🏢", cluster: "hospitality", tags: ["long_stay", "business"], serviceModes: ["onsite"], timeRelevance: [] }),
      sub({ value: "hostel", label: "Hostel", emoji: "🛏️", cluster: "hospitality", tags: ["budget", "backpacker"], serviceModes: ["onsite"], timeRelevance: [] }),
    ],
  },

  // ─── HEALTHCARE ───────────────────────────────────────────
  {
    value: "healthcare",
    label: "Healthcare",
    emoji: "🏥",
    radarCategory: "services",
    clusters: [
      { value: "medical", label: "Medical", emoji: "🏥" },
    ],
    subcategories: [
      sub({ value: "clinic", label: "Clinic", emoji: "🏥", cluster: "medical" }),
      sub({ value: "dentist", label: "Dentist", emoji: "🦷", cluster: "medical" }),
      sub({ value: "physio", label: "Physio", emoji: "🩺", cluster: "medical" }),
    ],
  },

  // ─── MOBILITY ─────────────────────────────────────────────
  {
    value: "mobility",
    label: "Mobility",
    emoji: "🚕",
    radarCategory: "services",
    clusters: [
      { value: "transport", label: "Transport", emoji: "🚕" },
    ],
    subcategories: [
      sub({ value: "taxi", label: "Taxi", emoji: "🚕", cluster: "transport" }),
      sub({ value: "chauffeur", label: "Chauffeur", emoji: "🚘", cluster: "transport" }),
      sub({ value: "car_rental", label: "Car Rental", emoji: "🚗", cluster: "transport" }),
    ],
  },

  // ─── EXPERIENCES ──────────────────────────────────────────
  {
    value: "experiences",
    label: "Experiences",
    emoji: "🎯",
    radarCategory: "services",
    clusters: [
      { value: "leisure", label: "Leisure", emoji: "🎯" },
    ],
    subcategories: [
      sub({ value: "activities", label: "Activities", emoji: "🎯", cluster: "leisure" }),
      sub({ value: "events", label: "Events", emoji: "🎫", cluster: "leisure" }),
      sub({ value: "tickets", label: "Tickets", emoji: "🎟️", cluster: "leisure" }),
    ],
  },
];

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
//  NORMALIZATION
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
  mobility: "mobility",
  transport: "mobility",
  experiences: "experiences",
  activities: "experiences",
};

const SUBCATEGORY_ALIASES: Record<string, string> = {
  "fast food": "fast_food",
  fastfood: "fast_food",
  "fried chicken": "fried_chicken",
  "lounge cafe": "lounge_cafe",
  "cafe lounge": "lounge_cafe",
  coffee: "cafe",
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

/**
 * Returns hierarchy depth-match score for a point against a target filter.
 * exact subcategory = 3, same cluster = 2, same vertical = 1, no match = 0.
 */
export function hierarchyMatchScore(
  pointSub: string | null | undefined,
  targetSub?: string | null,
  targetVertical?: string | null
): number {
  if (!pointSub) return 0;
  const normPoint = normalizeSubcategory(pointSub);
  if (!normPoint) return 0;

  // Exact subcategory match
  if (targetSub) {
    const normTarget = normalizeSubcategory(targetSub);
    if (normPoint === normTarget) return 3;
  }

  // Find parent info for the point's subcategory
  const pointVertical = getParentVertical(normPoint);
  if (!pointVertical) return 0;

  // Cluster match: same cluster within same vertical as the target subcategory
  if (targetSub) {
    const normTarget = normalizeSubcategory(targetSub);
    if (normTarget) {
      const targetInfo = pointVertical.subcategories.find((s) => s.value === normTarget);
      const pointInfo = pointVertical.subcategories.find((s) => s.value === normPoint);
      if (targetInfo && pointInfo && targetInfo.cluster === pointInfo.cluster) return 2;
    }
  }

  // Vertical match
  if (targetVertical) {
    const normVert = normalizeVertical(targetVertical);
    if (pointVertical.value === normVert) return 1;
  }

  return 0;
}

/**
 * Get the cluster value for a given subcategory.
 */
export function getClusterForSubcategory(subValue: string): string | null {
  const norm = normalizeSubcategory(subValue);
  if (!norm) return null;
  for (const v of CANONICAL_VERTICALS) {
    const found = v.subcategories.find((s) => s.value === norm);
    if (found) return found.cluster;
  }
  return null;
}
