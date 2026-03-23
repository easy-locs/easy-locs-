/**
 * CANONICAL TAXONOMY — Single Source of Truth
 * ============================================
 * Every screen, store, filter, map, radar, search, import, and hub MUST use this file.
 * No other category/subcategory definitions should exist.
 *
 * Structure: Vertical → Subcategory (flat, no intermediate cluster needed for filtering)
 * Clusters are cosmetic groupings used only for UI display.
 */

export interface CanonicalSubcategory {
  value: string;
  label: string;
  emoji: string;
  /** Alias for emoji — backward compat with old SubcategoryDef.icon */
  icon: string;
  /** Optional cluster for UI grouping (e.g. "Cuisine", "Drinks") */
  cluster?: string;
}

export interface CanonicalVertical {
  value: string;
  label: string;
  emoji: string;
  /** Lucide icon name for UI */
  icon: string;
  gradient: string;
  seoTitle: string;
  seoDescription: string;
  subcategories: CanonicalSubcategory[];
}

// ─── FOOD ───────────────────────────────────────────────────
const FOOD_SUBCATEGORIES: CanonicalSubcategory[] = [
  // Cuisine types
  { value: "fast_food", label: "Fast Food", emoji: "🍔", icon: "🍔", cluster: "Quick Bites" },
  { value: "burger", label: "Burger", emoji: "🍔", icon: "🍔", cluster: "Quick Bites" },
  { value: "pizza", label: "Pizza", emoji: "🍕", icon: "🍕", cluster: "Quick Bites" },
  { value: "fried_chicken", label: "Fried Chicken", emoji: "🍗", icon: "🍗", cluster: "Quick Bites" },
  { value: "wraps", label: "Wraps & Shawarma", emoji: "🌯", icon: "🌯", cluster: "Quick Bites" },

  { value: "italian", label: "Italian", emoji: "🍝", icon: "🍝", cluster: "Cuisine" },
  { value: "japanese", label: "Japanese", emoji: "🍣", icon: "🍣", cluster: "Cuisine" },
  { value: "sushi", label: "Sushi", emoji: "🍣", icon: "🍣", cluster: "Cuisine" },
  { value: "indian", label: "Indian", emoji: "🍛", icon: "🍛", cluster: "Cuisine" },
  { value: "chinese", label: "Chinese", emoji: "🥡", icon: "🥡", cluster: "Cuisine" },
  { value: "lebanese", label: "Lebanese", emoji: "🥙", icon: "🥙", cluster: "Cuisine" },
  { value: "arabic", label: "Arabic", emoji: "🧆", icon: "🧆", cluster: "Cuisine" },
  { value: "turkish", label: "Turkish", emoji: "🥘", icon: "🥘", cluster: "Cuisine" },
  { value: "french", label: "French", emoji: "🥐", icon: "🥐", cluster: "Cuisine" },
  { value: "american", label: "American", emoji: "🌮", icon: "🌮", cluster: "Cuisine" },
  { value: "asian", label: "Asian Fusion", emoji: "🍜", icon: "🍜", cluster: "Cuisine" },
  { value: "seafood", label: "Seafood", emoji: "🦐", icon: "🦐", cluster: "Cuisine" },
  { value: "mexican", label: "Mexican", emoji: "🌮", icon: "🌮", cluster: "Cuisine" },
  { value: "thai", label: "Thai", emoji: "🍜", icon: "🍜", cluster: "Cuisine" },
  { value: "korean", label: "Korean", emoji: "🍱", icon: "🍱", cluster: "Cuisine" },

  // Dining style
  { value: "restaurant", label: "Restaurant", emoji: "🍽️", icon: "🍽️", cluster: "Dining" },
  { value: "dineout", label: "Dine Out", emoji: "🍷", icon: "🍷", cluster: "Dining" },
  { value: "healthy", label: "Healthy", emoji: "🥗", icon: "🥗", cluster: "Dining" },
  { value: "breakfast", label: "Breakfast", emoji: "🥞", icon: "🥞", cluster: "Dining" },
  { value: "brunch", label: "Brunch", emoji: "🥂", icon: "🥂", cluster: "Dining" },

  // Café & Bakery
  { value: "cafe", label: "Café", emoji: "☕", icon: "☕", cluster: "Café & Bakery" },
  { value: "lounge_cafe", label: "Lounge Café", emoji: "🛋️", icon: "🛋️", cluster: "Café & Bakery" },
  { value: "bakery", label: "Bakery", emoji: "🍰", icon: "🍰", cluster: "Café & Bakery" },
  { value: "desserts", label: "Desserts", emoji: "🍩", icon: "🍩", cluster: "Café & Bakery" },
  { value: "beverages", label: "Beverages", emoji: "🥤", icon: "🥤", cluster: "Café & Bakery" },
  { value: "coffee", label: "Coffee", emoji: "☕", icon: "☕", cluster: "Café & Bakery" },

  // Special
  { value: "catering", label: "Catering", emoji: "🍴", icon: "🍴", cluster: "Special" },
  { value: "private_chef", label: "Private Chef", emoji: "👨‍🍳", icon: "👨‍🍳", cluster: "Special" },
];

// ─── GROCERY ────────────────────────────────────────────────
const GROCERY_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "supermarket", label: "Supermarket", emoji: "🏪", icon: "🏪" },
  { value: "mini_mart", label: "Mini Mart", emoji: "🏬", icon: "🏬" },
  { value: "organic_store", label: "Organic & Specialty", emoji: "🌿", icon: "🌿" },
  { value: "butcher", label: "Butcher", emoji: "🥩", icon: "🥩" },
  { value: "fruits_vegetables", label: "Fruits & Vegetables", emoji: "🥬", icon: "🥬" },
  { value: "dairy", label: "Dairy", emoji: "🥛", icon: "🥛" },
  { value: "bakery_grocery", label: "Bakery", emoji: "🍞", icon: "🍞" },
  { value: "beverages_store", label: "Beverages", emoji: "🥤", icon: "🥤" },
  { value: "snacks", label: "Snacks", emoji: "🍿", icon: "🍿" },
  { value: "frozen", label: "Frozen", emoji: "🧊", icon: "🧊" },
  { value: "meat_seafood", label: "Meat & Seafood", emoji: "🥩", icon: "🥩" },
  { value: "eggs", label: "Eggs", emoji: "🥚", icon: "🥚" },
  { value: "water", label: "Water", emoji: "💧", icon: "💧" },
  { value: "baby", label: "Baby Essentials", emoji: "🍼", icon: "🍼" },
  { value: "household", label: "Household", emoji: "🧹", icon: "🧹" },
  { value: "personal_hygiene", label: "Personal Hygiene", emoji: "🧴", icon: "🧴" },
  { value: "ready_to_eat", label: "Ready to Eat", emoji: "🥡", icon: "🥡" },
];

// ─── SHOPS / RETAIL ─────────────────────────────────────────
const SHOPS_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "fashion", label: "Fashion", emoji: "👗", icon: "👗" },
  { value: "electronics", label: "Electronics", emoji: "📱", icon: "📱" },
  { value: "pharmacy", label: "Pharmacy", emoji: "💊", icon: "💊" },
  { value: "beauty_store", label: "Beauty", emoji: "💄", icon: "💄" },
  { value: "gifts", label: "Gifts", emoji: "🎁", icon: "🎁" },
  { value: "flowers", label: "Flowers", emoji: "🌹", icon: "🌹" },
  { value: "pets_store", label: "Pet Supplies", emoji: "🐾", icon: "🐾" },
  { value: "home_decor", label: "Home Décor", emoji: "🪑", icon: "🪑" },
  { value: "accessories", label: "Accessories", emoji: "👜", icon: "👜" },
  { value: "furniture", label: "Furniture", emoji: "🪑", icon: "🪑" },
  { value: "hardware", label: "Hardware", emoji: "🔩", icon: "🔩" },
  { value: "luxury", label: "Luxury", emoji: "💎", icon: "💎" },
  { value: "sports_store", label: "Sports", emoji: "⚽", icon: "⚽" },
  { value: "toys", label: "Toys & Games", emoji: "🧸", icon: "🧸" },
  { value: "stationery", label: "Stationery", emoji: "📝", icon: "📝" },
  { value: "variety", label: "Variety Store", emoji: "🏬", icon: "🏬" },
];

// ─── SERVICES ───────────────────────────────────────────────
const SERVICES_SUBCATEGORIES: CanonicalSubcategory[] = [
  // Home
  { value: "cleaning", label: "Cleaning", emoji: "🧹", icon: "🧹", cluster: "Home" },
  { value: "laundry", label: "Laundry", emoji: "👔", icon: "👔", cluster: "Home" },
  { value: "handyman", label: "Handyman", emoji: "🔧", icon: "🔧", cluster: "Home" },
  { value: "plumbing", label: "Plumbing", emoji: "🚿", icon: "🚿", cluster: "Home" },
  { value: "electrical", label: "Electrical", emoji: "⚡", icon: "⚡", cluster: "Home" },
  { value: "ac_repair", label: "AC Repair", emoji: "❄️", icon: "❄️", cluster: "Home" },
  { value: "pest_control", label: "Pest Control", emoji: "🐛", icon: "🐛", cluster: "Home" },
  { value: "movers", label: "Moving", emoji: "🚛", icon: "🚛", cluster: "Home" },
  { value: "painting", label: "Painting", emoji: "🎨", icon: "🎨", cluster: "Home" },
  { value: "landscaping", label: "Landscaping", emoji: "🌿", icon: "🌿", cluster: "Home" },
  { value: "construction", label: "Renovation", emoji: "🏗️", icon: "🏗️", cluster: "Home" },
  { value: "gardening", label: "Gardening", emoji: "🌱", icon: "🌱", cluster: "Home" },

  // Repair
  { value: "mobile_repair", label: "Mobile Repair", emoji: "📱", icon: "📱", cluster: "Repair" },
  { value: "electronics_repair", label: "Electronics Repair", emoji: "💻", icon: "💻", cluster: "Repair" },
  { value: "car_repair", label: "Car Repair", emoji: "🔧", icon: "🔧", cluster: "Repair" },
  { value: "car_wash", label: "Car Wash", emoji: "🚗", icon: "🚗", cluster: "Repair" },

  // Beauty & Wellness
  { value: "salon", label: "Salon", emoji: "💇", icon: "💇", cluster: "Beauty" },
  { value: "barber", label: "Barber", emoji: "💈", icon: "💈", cluster: "Beauty" },
  { value: "beauty", label: "Beauty & Spa", emoji: "💆", icon: "💆", cluster: "Beauty" },
  { value: "spa", label: "Spa", emoji: "🧖", icon: "🧖", cluster: "Beauty" },
  { value: "fitness", label: "Fitness", emoji: "🏋️", icon: "🏋️", cluster: "Beauty" },

  // Professional
  { value: "legal", label: "Legal", emoji: "⚖️", icon: "⚖️", cluster: "Professional" },
  { value: "accounting", label: "Accounting", emoji: "🧮", icon: "🧮", cluster: "Professional" },
  { value: "consulting", label: "Consulting", emoji: "📊", icon: "📊", cluster: "Professional" },
  { value: "insurance", label: "Insurance", emoji: "🛡️", icon: "🛡️", cluster: "Professional" },
  { value: "translation", label: "Translation", emoji: "🌐", icon: "🌐", cluster: "Professional" },
  { value: "business_services", label: "Business Services", emoji: "💼", icon: "💼", cluster: "Professional" },
  { value: "coworking", label: "Coworking", emoji: "💻", icon: "💻", cluster: "Professional" },

  // Personal
  { value: "tailoring", label: "Tailoring", emoji: "🧵", icon: "🧵", cluster: "Personal" },
  { value: "printing", label: "Printing", emoji: "🖨️", icon: "🖨️", cluster: "Personal" },
  { value: "tutoring", label: "Tutoring", emoji: "📚", icon: "📚", cluster: "Personal" },
  { value: "photography", label: "Photography", emoji: "📸", icon: "📸", cluster: "Personal" },
  { value: "pet_care", label: "Pet Care", emoji: "🐾", icon: "🐾", cluster: "Personal" },
  { value: "education", label: "Education", emoji: "📚", icon: "📚", cluster: "Personal" },
];

// ─── PROPERTY ───────────────────────────────────────────────
const PROPERTY_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "apartment", label: "Apartment", emoji: "🏢", icon: "🏢" },
  { value: "villa", label: "Villa", emoji: "🏡", icon: "🏡" },
  { value: "office", label: "Office", emoji: "🏢", icon: "🏢" },
  { value: "warehouse", label: "Warehouse", emoji: "🏭", icon: "🏭" },
  { value: "short_stay", label: "Short Stay", emoji: "🏨", icon: "🏨" },
  { value: "commercial_space", label: "Commercial", emoji: "🏬", icon: "🏬" },
  { value: "rent", label: "Rent", emoji: "🔑", icon: "🔑" },
  { value: "sale", label: "Buy", emoji: "🏠", icon: "🏠" },
];

// ─── HEALTHCARE ─────────────────────────────────────────────
const HEALTHCARE_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "pharmacy", label: "Pharmacy", emoji: "💊", icon: "💊" },
  { value: "clinic", label: "Clinic", emoji: "🏥", icon: "🏥" },
  { value: "dental", label: "Dental", emoji: "🦷", icon: "🦷" },
  { value: "optician", label: "Optician", emoji: "👓", icon: "👓" },
  { value: "lab_tests", label: "Lab Tests", emoji: "🧪", icon: "🧪" },
  { value: "wellness", label: "Wellness", emoji: "🧘", icon: "🧘" },
  { value: "iv_therapy", label: "IV Therapy", emoji: "💉", icon: "💉" },
  { value: "vet", label: "Veterinary", emoji: "🩺", icon: "🩺" },
];

// ─── MOBILITY ───────────────────────────────────────────────
const MOBILITY_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "car_rental", label: "Car Rental", emoji: "🚗", icon: "🚗" },
  { value: "airport_transfer", label: "Airport Transfer", emoji: "✈️", icon: "✈️" },
  { value: "private_driver", label: "Private Driver", emoji: "🚘", icon: "🚘" },
  { value: "transport", label: "Transport", emoji: "🚐", icon: "🚐" },
  { value: "taxi", label: "Taxi", emoji: "🚕", icon: "🚕" },
];

// ─── EXPERIENCES ────────────────────────────────────────────
const EXPERIENCES_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "tours", label: "Tours & Activities", emoji: "🗺️", icon: "🗺️" },
  { value: "water_sport", label: "Water Sports", emoji: "🏄", icon: "🏄" },
  { value: "sports_coach", label: "Sports Coach", emoji: "🏋️", icon: "🏋️" },
  { value: "event", label: "Events & Tickets", emoji: "🎫", icon: "🎫" },
  { value: "outdoor", label: "Outdoor & Adventure", emoji: "🧗", icon: "🧗" },
  { value: "local_activity", label: "Local Activities", emoji: "🎭", icon: "🎭" },
  { value: "luxury_concierge", label: "Luxury Concierge", emoji: "💎", icon: "💎" },
];

// ═══════════════════════════════════════════════════════════
//  CANONICAL VERTICALS — The single source of truth
// ═══════════════════════════════════════════════════════════
export const CANONICAL_VERTICALS: CanonicalVertical[] = [
  {
    value: "food",
    label: "Food & Dining",
    emoji: "🍕",
    icon: "UtensilsCrossed",
    gradient: "linear-gradient(135deg, hsl(16 85% 50%), hsl(30 80% 55%))",
    seoTitle: "Food & Restaurants — Order & Discover | Easy-Locs",
    seoDescription: "Browse nearby restaurants, cafés, bakeries and order your favourite cuisine.",
    subcategories: FOOD_SUBCATEGORIES,
  },
  {
    value: "grocery",
    label: "Grocery & Market",
    emoji: "🛒",
    icon: "ShoppingCart",
    gradient: "linear-gradient(135deg, hsl(120 50% 40%), hsl(140 55% 50%))",
    seoTitle: "Grocery & Market — Fresh Delivery | Easy-Locs",
    seoDescription: "Order fresh fruits, vegetables, dairy and household essentials.",
    subcategories: GROCERY_SUBCATEGORIES,
  },
  {
    value: "shops",
    label: "Shops & Retail",
    emoji: "🛍️",
    icon: "ShoppingBag",
    gradient: "linear-gradient(135deg, hsl(270 55% 50%), hsl(290 50% 60%))",
    seoTitle: "Shops & Retail — Browse Local Stores | Easy-Locs",
    seoDescription: "Discover local shops: fashion, electronics, pharmacy and more.",
    subcategories: SHOPS_SUBCATEGORIES,
  },
  {
    value: "services",
    label: "Services",
    emoji: "🔧",
    icon: "Wrench",
    gradient: "linear-gradient(135deg, hsl(220 70% 45%), hsl(220 60% 60%))",
    seoTitle: "Services — Book Professionals Near You | Easy-Locs",
    seoDescription: "Find and book trusted professionals for cleaning, repair, beauty and more.",
    subcategories: SERVICES_SUBCATEGORIES,
  },
  {
    value: "property",
    label: "Property",
    emoji: "🏠",
    icon: "Building2",
    gradient: "linear-gradient(135deg, hsl(210 70% 45%), hsl(200 60% 55%))",
    seoTitle: "Property — Buy, Rent & Short Stay | Easy-Locs",
    seoDescription: "Browse properties for sale, rent, or short-term stays.",
    subcategories: PROPERTY_SUBCATEGORIES,
  },
  {
    value: "healthcare",
    label: "Healthcare",
    emoji: "💊",
    icon: "Heart",
    gradient: "linear-gradient(135deg, hsl(160 60% 40%), hsl(170 55% 50%))",
    seoTitle: "Healthcare — Medical Services Near You | Easy-Locs",
    seoDescription: "Find pharmacies, clinics, dental and wellness services.",
    subcategories: HEALTHCARE_SUBCATEGORIES,
  },
  {
    value: "mobility",
    label: "Mobility",
    emoji: "🚕",
    icon: "Car",
    gradient: "linear-gradient(135deg, hsl(45 80% 50%), hsl(50 75% 55%))",
    seoTitle: "Mobility — Rides & Transport | Easy-Locs",
    seoDescription: "Book car rentals, airport transfers, and private drivers.",
    subcategories: MOBILITY_SUBCATEGORIES,
  },
  {
    value: "experiences",
    label: "Experiences",
    emoji: "🗺️",
    icon: "Compass",
    gradient: "linear-gradient(135deg, hsl(30 70% 50%), hsl(40 65% 55%))",
    seoTitle: "Experiences — Tours & Activities | Easy-Locs",
    seoDescription: "Discover tours, water sports, events and local adventures.",
    subcategories: EXPERIENCES_SUBCATEGORIES,
  },
];

// ═══════════════════════════════════════════════════════════
//  RADAR CATEGORIES — The 6 top-level categories for radar/map
// ═══════════════════════════════════════════════════════════
export type RadarMainCategory = "all" | "food" | "grocery" | "shops" | "services" | "property";

export const RADAR_CATEGORIES: { value: RadarMainCategory; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "✨" },
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "grocery", label: "Grocery", emoji: "🛒" },
  { value: "shops", label: "Shops", emoji: "🛍️" },
  { value: "services", label: "Services", emoji: "🔧" },
  { value: "property", label: "Property", emoji: "🏠" },
];

// ═══════════════════════════════════════════════════════════
//  NORMALIZATION — Map any raw label to canonical values
// ═══════════════════════════════════════════════════════════

/** All canonical subcategory values as a flat set for validation */
const ALL_SUBS = new Set<string>(
  CANONICAL_VERTICALS.flatMap((v) => v.subcategories.map((s) => s.value))
);

/** Maps any raw vertical/category string to canonical vertical value */
const VERTICAL_ALIASES: Record<string, string> = {
  food: "food", restaurant: "food", cafe: "food", dining: "food", food_work: "food",
  grocery: "grocery", supermarket: "grocery", market: "grocery",
  shops: "shops", retail: "shops", fashion: "shops", electronics: "shops", gifts: "shops", pets: "shops",
  services: "services", home_services: "services", professional: "services", beauty: "services",
  property: "property", real_estate: "property", realestate: "property",
  healthcare: "healthcare", health: "healthcare",
  mobility: "mobility", concierge: "mobility", transport: "mobility",
  experiences: "experiences", activities: "experiences",
};

/** Maps any raw subcategory string to canonical subcategory value */
const SUBCATEGORY_ALIASES: Record<string, string> = {
  // Food aliases
  "fast food": "fast_food", fastfood: "fast_food",
  "fried chicken": "fried_chicken",
  "cafe lounge": "lounge_cafe", "lounge cafe": "lounge_cafe",
  coffee: "cafe", "coffee shop": "cafe",
  "ice cream": "desserts",

  // Service aliases
  repair: "handyman", maintenance: "handyman",
  "mobile repair": "mobile_repair", "phone repair": "mobile_repair",
  "tech repair": "electronics_repair",
  "auto repair": "car_repair",
  moving: "movers",
  "personal services": "beauty",

  // Grocery aliases
  "mini mart": "mini_mart",
  "organic store": "organic_store", organic: "organic_store",
  fruits: "fruits_vegetables", vegetables: "fruits_vegetables",
  "cheese butter": "dairy", "cheese & butter": "dairy",
  beverages: "beverages_store",

  // Property aliases
  commercial: "commercial_space",
  "short stay": "short_stay",

  // Direct pass-throughs for common DB values
  ac_repair: "ac_repair",
  car_wash: "car_wash",
};

/**
 * Normalize any raw vertical string to a canonical vertical value.
 */
export function normalizeVertical(raw: string | null | undefined): string {
  if (!raw) return "services";
  const key = raw.toLowerCase().trim();
  return VERTICAL_ALIASES[key] ?? key;
}

/**
 * Normalize any raw subcategory string to a canonical subcategory value.
 * Returns the value as-is if already canonical, alias-resolved if matched, or the cleaned key.
 */
export function normalizeSubcategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (ALL_SUBS.has(key)) return key;
  const aliased = SUBCATEGORY_ALIASES[raw.toLowerCase().trim()];
  if (aliased && ALL_SUBS.has(aliased)) return aliased;
  if (SUBCATEGORY_ALIASES[key]) return SUBCATEGORY_ALIASES[key];
  return ALL_SUBS.has(key) ? key : key; // pass through cleaned
}

/**
 * Map vertical → RadarMainCategory for radar/map filtering.
 */
export function verticalToRadarCategory(vertical: string): RadarMainCategory {
  const map: Record<string, RadarMainCategory> = {
    food: "food",
    grocery: "grocery",
    shops: "shops",
    services: "services",
    property: "property",
    healthcare: "services",
    mobility: "services",
    experiences: "services",
  };
  return map[normalizeVertical(vertical)] ?? "shops";
}

// ═══════════════════════════════════════════════════════════
//  LOOKUP HELPERS
// ═══════════════════════════════════════════════════════════

/** Get a canonical vertical definition */
export function getCanonicalVertical(value: string) {
  const norm = normalizeVertical(value);
  return CANONICAL_VERTICALS.find((v) => v.value === norm);
}

/** Get subcategory info from any vertical */
export function getCanonicalSubcategory(subValue: string): CanonicalSubcategory | undefined {
  const norm = normalizeSubcategory(subValue) ?? subValue;
  for (const v of CANONICAL_VERTICALS) {
    const found = v.subcategories.find((s) => s.value === norm);
    if (found) return found;
  }
  return undefined;
}

/** Get the parent vertical for a subcategory */
export function getParentVertical(subValue: string): CanonicalVertical | undefined {
  const norm = normalizeSubcategory(subValue) ?? subValue;
  return CANONICAL_VERTICALS.find((v) => v.subcategories.some((s) => s.value === norm));
}

/** Get subcategories for a radar category */
export function getSubcategoriesForRadarCategory(cat: RadarMainCategory): CanonicalSubcategory[] {
  if (cat === "all") return [];
  const verticalMap: Record<string, string[]> = {
    food: ["food"],
    grocery: ["grocery"],
    shops: ["shops"],
    services: ["services", "healthcare", "mobility"],
    property: ["property"],
  };
  const verticals = verticalMap[cat] ?? [];
  return CANONICAL_VERTICALS
    .filter((v) => verticals.includes(v.value))
    .flatMap((v) => v.subcategories);
}

/** Get unique clusters for a list of subcategories */
export function getSubcategoryClusters(subs: CanonicalSubcategory[]): string[] {
  const clusters = new Set<string>();
  for (const s of subs) {
    if (s.cluster) clusters.add(s.cluster);
  }
  return [...clusters];
}

/** Flat list of all canonical subcategory values */
export const ALL_SUBCATEGORY_VALUES = [...ALL_SUBS];

/** Backward-compatible VERTICALS alias */
export const VERTICALS = CANONICAL_VERTICALS;
