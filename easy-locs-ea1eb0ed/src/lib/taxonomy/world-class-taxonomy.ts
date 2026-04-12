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
  | "stay"
  | "healthcare"
  | "mobility"
  | "experiences"
  | "utility"
  | "education"
  | "finance";

export type RadarMainCategory =
  | "all"
  | "food"
  | "grocery"
  | "shops"
  | "services"
  | "property"
  | "utility"
  | "stay"
  | "healthcare"
  | "mobility"
  | "nightlife"
  | "experiences";

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
  fine_dining: ["dine_in"],
  pakistani: ["delivery", "pickup", "dine_in"],
  pasta: ["delivery", "pickup", "dine_in"],
  asian: ["delivery", "pickup", "dine_in"],
  mexican: ["delivery", "pickup", "dine_in"],
  turkish: ["delivery", "pickup", "dine_in"],
  italian: ["delivery", "pickup", "dine_in"],
  indian: ["delivery", "pickup", "dine_in"],
  chinese: ["delivery", "pickup", "dine_in"],
  lebanese: ["delivery", "pickup", "dine_in"],
  arabic: ["delivery", "pickup", "dine_in"],
  thai: ["delivery", "pickup", "dine_in"],
  korean: ["delivery", "pickup", "dine_in"],
  japanese: ["delivery", "pickup", "dine_in"],
  seafood: ["delivery", "pickup", "dine_in"],
  healthy: ["delivery", "pickup", "dine_in"],
  vietnamese: ["delivery", "pickup", "dine_in"],
  greek: ["delivery", "pickup", "dine_in"],
  french: ["delivery", "pickup", "dine_in"],
  spanish: ["delivery", "pickup", "dine_in"],
  african: ["delivery", "pickup", "dine_in"],
  ethiopian: ["delivery", "pickup", "dine_in"],
  caribbean: ["delivery", "pickup", "dine_in"],
  persian: ["delivery", "pickup", "dine_in"],
  filipino: ["delivery", "pickup", "dine_in"],
  brazilian: ["delivery", "pickup", "dine_in"],
  german: ["delivery", "pickup", "dine_in"],
  moroccan: ["delivery", "pickup", "dine_in"],
  bbq: ["delivery", "pickup", "dine_in"],
  vegan: ["delivery", "pickup", "dine_in"],
  juice_bar: ["pickup", "delivery"],
  food_truck: ["pickup"],
  ice_cream: ["pickup", "delivery", "dine_in"],
  steakhouse: ["dine_in", "delivery"],
  buffet: ["dine_in"],
  cloud_kitchen: ["delivery"],
  food_court: ["dine_in", "pickup"],
  casual_dining: ["dine_in", "delivery", "pickup"],
  smoothie_bar: ["pickup", "delivery"],
  tea_house: ["dine_in", "pickup"],
  chocolate: ["pickup", "delivery"],
  pastry: ["pickup", "delivery", "dine_in"],
  delivery_takeaway: ["delivery", "pickup"],
  // Grocery subs
  supermarket: ["delivery", "pickup"],
  mini_mart: ["delivery", "pickup"],
  organic_store: ["delivery", "pickup"],
  fruits_vegetables: ["delivery", "pickup"],
  butcher: ["delivery", "pickup"],
  dairy: ["delivery", "pickup"],
  beverages_store: ["delivery", "pickup"],
  snacks: ["delivery", "pickup"],
  frozen: ["delivery", "pickup"],
  bakery_grocery: ["delivery", "pickup"],
  baby_products: ["delivery", "pickup"],
  household: ["delivery", "pickup"],
  personal_care: ["delivery", "pickup"],
  pet_food: ["delivery", "pickup"],
  fish_market: ["delivery", "pickup"],
  spices: ["delivery", "pickup"],
  health_food: ["delivery", "pickup"],
  gourmet: ["delivery", "pickup"],
  water_delivery: ["delivery"],
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
  photography: ["onsite", "home_service"],
  accounting: ["onsite", "virtual"],
  insurance: ["onsite", "virtual"],
  pet_grooming: ["onsite", "home_service"],
  gardening: ["home_service", "onsite"],
  painting: ["home_service", "onsite"],
  interior_design: ["onsite", "virtual"],
  key_cutting: ["onsite", "home_service"],
  carpentry: ["home_service", "onsite"],
  it_support: ["onsite", "home_service", "virtual"],
  consulting: ["onsite", "virtual"],
  marketing: ["onsite", "virtual"],
  hvac: ["home_service", "onsite"],
  tire_service: ["onsite"],
  technician: ["home_service", "onsite"],
  delivery_service: ["home_service"],
  nails: ["onsite"],
  makeup: ["onsite", "home_service"],
  lashes: ["onsite"],
  tattoo: ["onsite"],
  massage: ["onsite", "home_service"],
  // Mobility subs
  taxi: ["onsite"],
  chauffeur: ["onsite"],
  car_rental: ["onsite"],
  premium: ["onsite"],
  bike: ["onsite"],
  scooter: ["onsite"],
  // Delivery
  courier: ["delivery"],
  freight: ["delivery"],
  // Stay (hospitality)
  hotel: ["onsite"],
  resort: ["onsite"],
  boutique: ["onsite"],
  hostel: ["onsite"],
  apartment_hotel: ["onsite"],
  holiday_rental: ["onsite"],
  serviced_apartment: ["onsite"],
  short_stay: ["onsite"],
  motel: ["onsite"],
  bed_breakfast: ["onsite"],
  glamping: ["onsite"],
  eco_lodge: ["onsite"],
  budget_hotel: ["onsite"],
  luxury_hotel: ["onsite"],
  desert_camp: ["onsite"],
  unique_stay: ["onsite"],
  // Health & Medical
  pharmacy: ["onsite", "delivery"],
  clinic: ["onsite"],
  hospital: ["onsite"],
  dentist: ["onsite"],
  physio: ["onsite"],
  veterinary: ["onsite"],
  optical: ["onsite"],
  lab: ["onsite"],
  mental_health: ["onsite", "virtual"],
  dermatology: ["onsite"],
  pediatrics: ["onsite"],
  // Shops extras
  wholesale: ["onsite"],
  digital_products: ["delivery"],
  // Property extras
  property_management: ["onsite"],
  cruise: ["onsite"],
  safari: ["onsite"],
  diving: ["onsite"],
  ski: ["onsite"],
  museum: ["onsite"],
  theme_park: ["onsite"],
  concert: ["onsite"],
  water_sports: ["onsite"],
  hiking: ["onsite"],
  city_tour: ["onsite"],
  cinema: ["onsite"],
  sports: ["onsite"],
  tourism: ["onsite"],
  // Education
  k12_school: ["onsite"],
  university: ["onsite"],
  courses: ["onsite", "virtual"],
  coaching: ["onsite", "virtual"],
  online_learning: ["virtual"],
  language_school: ["onsite"],
  driving_school: ["onsite"],
  daycare: ["onsite"],
  vocational: ["onsite"],
  music_school: ["onsite"],
  // Finance
  payments: ["onsite", "virtual"],
  transfers: ["virtual"],
  banking: ["onsite"],
  insurance_finance: ["onsite", "virtual"],
  exchange: ["onsite"],
  crypto: ["virtual"],
  investment_finance: ["onsite", "virtual"],
  microfinance: ["onsite"],
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
  fine_dining: ["dinner"],
  pakistani: ["lunch", "dinner"],
  pasta: ["lunch", "dinner"],
  asian: ["lunch", "dinner"],
  mexican: ["lunch", "dinner", "late_night"],
  turkish: ["lunch", "dinner"],
  italian: ["lunch", "dinner"],
  indian: ["lunch", "dinner"],
  chinese: ["lunch", "dinner"],
  lebanese: ["lunch", "dinner"],
  arabic: ["lunch", "dinner"],
  thai: ["lunch", "dinner"],
  korean: ["lunch", "dinner"],
  japanese: ["lunch", "dinner"],
  seafood: ["lunch", "dinner"],
  healthy: ["breakfast", "lunch", "snack"],
  vietnamese: ["lunch", "dinner"],
  greek: ["lunch", "dinner"],
  french: ["lunch", "dinner"],
  spanish: ["lunch", "dinner", "late_night"],
  african: ["lunch", "dinner"],
  ethiopian: ["lunch", "dinner"],
  caribbean: ["lunch", "dinner"],
  persian: ["lunch", "dinner"],
  filipino: ["lunch", "dinner"],
  brazilian: ["lunch", "dinner"],
  german: ["lunch", "dinner"],
  moroccan: ["lunch", "dinner"],
  bbq: ["lunch", "dinner"],
  vegan: ["breakfast", "lunch", "dinner"],
  juice_bar: ["breakfast", "snack"],
  food_truck: ["lunch", "snack", "late_night"],
  ice_cream: ["snack", "dinner"],
  steakhouse: ["dinner"],
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
    health: "healthcare",
    beauty: "services",
    taxi: "mobility",
    delivery: "mobility",
    property: "property",
    stay: "stay",
    travel: "experiences",
    utility: "utility",
    education: "education",
    finance: "finance",
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
    stay: "stay",
    healthcare: "healthcare",
    mobility: "mobility",
    experiences: "experiences",
    utility: "utility",
    education: "services",
    finance: "utility",
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
  { value: "stay", label: "Stay", emoji: "🏨" },
  { value: "healthcare", label: "Healthcare", emoji: "🏥" },
  { value: "mobility", label: "Mobility", emoji: "🚗" },
  { value: "nightlife", label: "Nightlife", emoji: "🌙" },
  { value: "experiences", label: "Experiences", emoji: "🎭" },
  { value: "property", label: "Property", emoji: "🏠" },
  { value: "utility", label: "Utility", emoji: "🏧" },
];

export const RADAR_QUICK_CATEGORIES: { id: RadarMainCategory; emoji: string; labelKey: string }[] =
  RADAR_CATEGORIES
    .filter(c => c.value !== "all" && c.value !== "utility")
    .map(c => ({ id: c.value, emoji: c.emoji, labelKey: `radar.layer_${c.value}` }));

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
  hotel: "stay",
  hostel: "stay",
  motel: "stay",
  accommodation: "stay",
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
  utility: "utility",
  atm: "utility",
  fuel: "utility",
  parking: "utility",
  "fuel station": "utility",
  "gas station": "utility",
  "petrol station": "utility",
  ambulance: "utility",
  veterinary: "utility",
  vet: "utility",
  bank: "utility",
  embassy: "utility",
  courthouse: "utility",
  "bus station": "utility",
  "train station": "utility",
  airport: "utility",
  "taxi stand": "utility",
  "public toilet": "utility",
  "water fountain": "utility",
  temple: "utility",
  synagogue: "utility",
  stay: "stay",
  hotel: "stay",
  hotels: "stay",
  resort: "stay",
  education: "education",
  school: "education",
  university: "education",
  training: "education",
  learning: "education",
  courses: "education",
  finance: "finance",
  banking: "finance",
  payments: "finance",
  fintech: "finance",
  "money transfer": "finance",
  insurance: "finance",
};

const SUBCATEGORY_ALIASES: Record<string, string> = {
  "fast food": "fast_food",
  fastfood: "fast_food",
  "fried chicken": "fried_chicken",
  "lounge cafe": "lounge_cafe",
  "cafe lounge": "lounge_cafe",
  "coffee shop": "cafe",
  "ice cream": "ice_cream",
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
  "vet clinic": "veterinary",
  "animal clinic": "veterinary",
  "pet clinic": "veterinary",
  "gas station": "fuel_station",
  essence: "fuel_station",
  pompier: "fire_station",
  pompiers: "fire_station",
  samu: "ambulance",
  gendarmerie: "police_station",
  commissariat: "police_station",
  urgences: "poi_hospital",
  clinique: "clinic",
  gare: "train_station",
  metro: "train_station",
  aeroport: "airport",
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
  "pho": "vietnamese",
  "banh mi": "vietnamese",
  gyros: "greek",
  souvlaki: "greek",
  tapas: "spanish",
  paella: "spanish",
  bistro: "french",
  brasserie: "french",
  "patisserie-cuisine": "french",
  jollof: "african",
  "west african": "african",
  nigerian: "african",
  ghanaian: "african",
  "jerk chicken": "caribbean",
  jamaican: "caribbean",
  iranian: "persian",
  kebab: "persian",
  churrasco: "brazilian",
  bratwurst: "german",
  schnitzel: "german",
  tagine: "moroccan",
  couscous: "moroccan",
  barbecue: "bbq",
  grill: "bbq",
  smokehouse: "bbq",
  "plant based": "vegan",
  plant_based: "vegan",
  vegetarian: "vegan",
  "smoothie bar": "juice_bar",
  smoothie: "juice_bar",
  "fresh juice": "juice_bar",
  "street food": "food_truck",
  "food cart": "food_truck",
  steak: "steakhouse",
  "steak house": "steakhouse",
  gelato: "ice_cream",
  "frozen yogurt": "ice_cream",
  ramen: "japanese",
  noodles: "asian",
  "dim sum": "chinese",
  dumplings: "chinese",
  taco: "mexican",
  tacos: "mexican",
  burrito: "mexican",
  biryani: "indian",
  curry: "indian",
  falafel: "lebanese",
  hummus: "lebanese",
  manakeesh: "lebanese",
  doner: "turkish",
  lahmacun: "turkish",
  "korean bbq": "korean",
  "pad thai": "thai",
  "bubble tea": "cafe",
  boba: "cafe",
  "tea house": "tea_house",
  "matcha bar": "tea_house",
  "chai shop": "tea_house",
  "chocolate shop": "chocolate",
  chocolatier: "chocolate",
  confectionery: "chocolate",
  "pastry shop": "pastry",
  patisserie: "pastry",
  "ghost kitchen": "cloud_kitchen",
  "virtual kitchen": "cloud_kitchen",
  "dark kitchen": "cloud_kitchen",
  "food hall": "food_court",
  "budget hotel": "budget_hotel",
  "economy hotel": "budget_hotel",
  "luxury hotel": "luxury_hotel",
  "5 star hotel": "luxury_hotel",
  "five star": "luxury_hotel",
  "desert camp": "desert_camp",
  "bedouin camp": "desert_camp",
  treehouse: "unique_stay",
  houseboat: "unique_stay",
  "e-bike": "scooter",
  "electric scooter": "scooter",
  "nail salon": "nails",
  manicure: "nails",
  pedicure: "nails",
  "makeup artist": "makeup",
  eyelash: "lashes",
  "brow bar": "lashes",
  "tattoo parlor": "tattoo",
  "tattoo studio": "tattoo",
  "massage therapy": "massage",
  photographer: "photography",
  "photo studio": "photography",
  accountant: "accounting",
  bookkeeper: "accounting",
  "dog grooming": "pet_grooming",
  "pet salon": "pet_grooming",
  landscaping: "gardening",
  "lawn care": "gardening",
  locksmith: "key_cutting",
  carpenter: "carpentry",
  "computer repair": "it_support",
  "tech support": "it_support",
  "bed and breakfast": "bed_breakfast",
  "bed & breakfast": "bed_breakfast",
  guesthouse: "bed_breakfast",
  "desert safari": "safari",
  scuba: "diving",
  snorkeling: "diving",
  skiing: "ski",
  snowboard: "ski",
  trekking: "hiking",
  sightseeing: "city_tour",
  "guided tour": "city_tour",
  "amusement park": "theme_park",
  "water park": "theme_park",
  "live music": "concert",
  surfing: "water_sports",
  kayak: "water_sports",
  "fish market": "fish_market",
  fishmonger: "fish_market",
  "spice shop": "spices",
  deli: "gourmet",
  delicatessen: "gourmet",
  "health store": "health_food",
  "supplement store": "health_food",
  convenience: "mini_mart",
  "convenience store": "mini_mart",
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
