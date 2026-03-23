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
  { value: "fast_food", label: "Fast Food", emoji: "🍔", cluster: "Quick Bites" },
  { value: "burger", label: "Burger", emoji: "🍔", cluster: "Quick Bites" },
  { value: "pizza", label: "Pizza", emoji: "🍕", cluster: "Quick Bites" },
  { value: "fried_chicken", label: "Fried Chicken", emoji: "🍗", cluster: "Quick Bites" },
  { value: "wraps", label: "Wraps & Shawarma", emoji: "🌯", cluster: "Quick Bites" },

  { value: "italian", label: "Italian", emoji: "🍝", cluster: "Cuisine" },
  { value: "japanese", label: "Japanese", emoji: "🍣", cluster: "Cuisine" },
  { value: "sushi", label: "Sushi", emoji: "🍣", cluster: "Cuisine" },
  { value: "indian", label: "Indian", emoji: "🍛", cluster: "Cuisine" },
  { value: "chinese", label: "Chinese", emoji: "🥡", cluster: "Cuisine" },
  { value: "lebanese", label: "Lebanese", emoji: "🥙", cluster: "Cuisine" },
  { value: "arabic", label: "Arabic", emoji: "🧆", cluster: "Cuisine" },
  { value: "turkish", label: "Turkish", emoji: "🥘", cluster: "Cuisine" },
  { value: "french", label: "French", emoji: "🥐", cluster: "Cuisine" },
  { value: "american", label: "American", emoji: "🌮", cluster: "Cuisine" },
  { value: "asian", label: "Asian Fusion", emoji: "🍜", cluster: "Cuisine" },
  { value: "seafood", label: "Seafood", emoji: "🦐", cluster: "Cuisine" },
  { value: "mexican", label: "Mexican", emoji: "🌮", cluster: "Cuisine" },
  { value: "thai", label: "Thai", emoji: "🍜", cluster: "Cuisine" },
  { value: "korean", label: "Korean", emoji: "🍱", cluster: "Cuisine" },

  // Dining style
  { value: "restaurant", label: "Restaurant", emoji: "🍽️", cluster: "Dining" },
  { value: "dineout", label: "Dine Out", emoji: "🍷", cluster: "Dining" },
  { value: "healthy", label: "Healthy", emoji: "🥗", cluster: "Dining" },
  { value: "breakfast", label: "Breakfast", emoji: "🥞", cluster: "Dining" },
  { value: "brunch", label: "Brunch", emoji: "🥂", cluster: "Dining" },

  // Café & Bakery
  { value: "cafe", label: "Café", emoji: "☕", cluster: "Café & Bakery" },
  { value: "lounge_cafe", label: "Lounge Café", emoji: "🛋️", cluster: "Café & Bakery" },
  { value: "bakery", label: "Bakery", emoji: "🍰", cluster: "Café & Bakery" },
  { value: "desserts", label: "Desserts", emoji: "🍩", cluster: "Café & Bakery" },
  { value: "beverages", label: "Beverages", emoji: "🥤", cluster: "Café & Bakery" },
  { value: "coffee", label: "Coffee", emoji: "☕", cluster: "Café & Bakery" },

  // Special
  { value: "catering", label: "Catering", emoji: "🍴", cluster: "Special" },
  { value: "private_chef", label: "Private Chef", emoji: "👨‍🍳", cluster: "Special" },
];

// ─── GROCERY ────────────────────────────────────────────────
const GROCERY_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "supermarket", label: "Supermarket", emoji: "🏪" },
  { value: "mini_mart", label: "Mini Mart", emoji: "🏬" },
  { value: "organic_store", label: "Organic & Specialty", emoji: "🌿" },
  { value: "butcher", label: "Butcher", emoji: "🥩" },
  { value: "fruits_vegetables", label: "Fruits & Vegetables", emoji: "🥬" },
  { value: "dairy", label: "Dairy", emoji: "🥛" },
  { value: "bakery_grocery", label: "Bakery", emoji: "🍞" },
  { value: "beverages_store", label: "Beverages", emoji: "🥤" },
  { value: "snacks", label: "Snacks", emoji: "🍿" },
  { value: "frozen", label: "Frozen", emoji: "🧊" },
  { value: "meat_seafood", label: "Meat & Seafood", emoji: "🥩" },
  { value: "eggs", label: "Eggs", emoji: "🥚" },
  { value: "water", label: "Water", emoji: "💧" },
  { value: "baby", label: "Baby Essentials", emoji: "🍼" },
  { value: "household", label: "Household", emoji: "🧹" },
  { value: "personal_hygiene", label: "Personal Hygiene", emoji: "🧴" },
  { value: "ready_to_eat", label: "Ready to Eat", emoji: "🥡" },
];

// ─── SHOPS / RETAIL ─────────────────────────────────────────
const SHOPS_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "fashion", label: "Fashion", emoji: "👗" },
  { value: "electronics", label: "Electronics", emoji: "📱" },
  { value: "pharmacy", label: "Pharmacy", emoji: "💊" },
  { value: "beauty_store", label: "Beauty", emoji: "💄" },
  { value: "gifts", label: "Gifts", emoji: "🎁" },
  { value: "flowers", label: "Flowers", emoji: "🌹" },
  { value: "pets_store", label: "Pet Supplies", emoji: "🐾" },
  { value: "home_decor", label: "Home Décor", emoji: "🪑" },
  { value: "accessories", label: "Accessories", emoji: "👜" },
  { value: "furniture", label: "Furniture", emoji: "🪑" },
  { value: "hardware", label: "Hardware", emoji: "🔩" },
  { value: "luxury", label: "Luxury", emoji: "💎" },
  { value: "sports_store", label: "Sports", emoji: "⚽" },
  { value: "toys", label: "Toys & Games", emoji: "🧸" },
  { value: "stationery", label: "Stationery", emoji: "📝" },
  { value: "variety", label: "Variety Store", emoji: "🏬" },
];

// ─── SERVICES ───────────────────────────────────────────────
const SERVICES_SUBCATEGORIES: CanonicalSubcategory[] = [
  // Home
  { value: "cleaning", label: "Cleaning", emoji: "🧹", cluster: "Home" },
  { value: "laundry", label: "Laundry", emoji: "👔", cluster: "Home" },
  { value: "handyman", label: "Handyman", emoji: "🔧", cluster: "Home" },
  { value: "plumbing", label: "Plumbing", emoji: "🚿", cluster: "Home" },
  { value: "electrical", label: "Electrical", emoji: "⚡", cluster: "Home" },
  { value: "ac_repair", label: "AC Repair", emoji: "❄️", cluster: "Home" },
  { value: "pest_control", label: "Pest Control", emoji: "🐛", cluster: "Home" },
  { value: "movers", label: "Moving", emoji: "🚛", cluster: "Home" },
  { value: "painting", label: "Painting", emoji: "🎨", cluster: "Home" },
  { value: "landscaping", label: "Landscaping", emoji: "🌿", cluster: "Home" },
  { value: "construction", label: "Renovation", emoji: "🏗️", cluster: "Home" },
  { value: "gardening", label: "Gardening", emoji: "🌱", cluster: "Home" },

  // Repair
  { value: "mobile_repair", label: "Mobile Repair", emoji: "📱", cluster: "Repair" },
  { value: "electronics_repair", label: "Electronics Repair", emoji: "💻", cluster: "Repair" },
  { value: "car_repair", label: "Car Repair", emoji: "🔧", cluster: "Repair" },
  { value: "car_wash", label: "Car Wash", emoji: "🚗", cluster: "Repair" },

  // Beauty & Wellness
  { value: "salon", label: "Salon", emoji: "💇", cluster: "Beauty" },
  { value: "barber", label: "Barber", emoji: "💈", cluster: "Beauty" },
  { value: "beauty", label: "Beauty & Spa", emoji: "💆", cluster: "Beauty" },
  { value: "spa", label: "Spa", emoji: "🧖", cluster: "Beauty" },
  { value: "fitness", label: "Fitness", emoji: "🏋️", cluster: "Beauty" },

  // Professional
  { value: "legal", label: "Legal", emoji: "⚖️", cluster: "Professional" },
  { value: "accounting", label: "Accounting", emoji: "🧮", cluster: "Professional" },
  { value: "consulting", label: "Consulting", emoji: "📊", cluster: "Professional" },
  { value: "insurance", label: "Insurance", emoji: "🛡️", cluster: "Professional" },
  { value: "translation", label: "Translation", emoji: "🌐", cluster: "Professional" },
  { value: "business_services", label: "Business Services", emoji: "💼", cluster: "Professional" },
  { value: "coworking", label: "Coworking", emoji: "💻", cluster: "Professional" },

  // Personal
  { value: "tailoring", label: "Tailoring", emoji: "🧵", cluster: "Personal" },
  { value: "printing", label: "Printing", emoji: "🖨️", cluster: "Personal" },
  { value: "tutoring", label: "Tutoring", emoji: "📚", cluster: "Personal" },
  { value: "photography", label: "Photography", emoji: "📸", cluster: "Personal" },
  { value: "pet_care", label: "Pet Care", emoji: "🐾", cluster: "Personal" },
  { value: "education", label: "Education", emoji: "📚", cluster: "Personal" },
];

// ─── PROPERTY ───────────────────────────────────────────────
const PROPERTY_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "apartment", label: "Apartment", emoji: "🏢" },
  { value: "villa", label: "Villa", emoji: "🏡" },
  { value: "office", label: "Office", emoji: "🏢" },
  { value: "warehouse", label: "Warehouse", emoji: "🏭" },
  { value: "short_stay", label: "Short Stay", emoji: "🏨" },
  { value: "commercial_space", label: "Commercial", emoji: "🏬" },
  { value: "rent", label: "Rent", emoji: "🔑" },
  { value: "sale", label: "Buy", emoji: "🏠" },
];

// ─── HEALTHCARE ─────────────────────────────────────────────
const HEALTHCARE_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "pharmacy", label: "Pharmacy", emoji: "💊" },
  { value: "clinic", label: "Clinic", emoji: "🏥" },
  { value: "dental", label: "Dental", emoji: "🦷" },
  { value: "optician", label: "Optician", emoji: "👓" },
  { value: "lab_tests", label: "Lab Tests", emoji: "🧪" },
  { value: "wellness", label: "Wellness", emoji: "🧘" },
  { value: "iv_therapy", label: "IV Therapy", emoji: "💉" },
  { value: "vet", label: "Veterinary", emoji: "🩺" },
];

// ─── MOBILITY ───────────────────────────────────────────────
const MOBILITY_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "car_rental", label: "Car Rental", emoji: "🚗" },
  { value: "airport_transfer", label: "Airport Transfer", emoji: "✈️" },
  { value: "private_driver", label: "Private Driver", emoji: "🚘" },
  { value: "transport", label: "Transport", emoji: "🚐" },
  { value: "taxi", label: "Taxi", emoji: "🚕" },
];

// ─── EXPERIENCES ────────────────────────────────────────────
const EXPERIENCES_SUBCATEGORIES: CanonicalSubcategory[] = [
  { value: "tours", label: "Tours & Activities", emoji: "🗺️" },
  { value: "water_sport", label: "Water Sports", emoji: "🏄" },
  { value: "sports_coach", label: "Sports Coach", emoji: "🏋️" },
  { value: "event", label: "Events & Tickets", emoji: "🎫" },
  { value: "outdoor", label: "Outdoor & Adventure", emoji: "🧗" },
  { value: "local_activity", label: "Local Activities", emoji: "🎭" },
  { value: "luxury_concierge", label: "Luxury Concierge", emoji: "💎" },
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
