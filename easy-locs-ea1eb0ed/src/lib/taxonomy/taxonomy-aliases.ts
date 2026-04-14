import { getAllSubcategoryValues } from "@/lib/taxonomy/category-tree";
import type {
  Vertical,
  RadarMainCategory,
  TaxonomyVertical,
  TaxonomySubcategory,
  TaxonomyCluster,
} from "./world-class-taxonomy";

import { CANONICAL_VERTICALS } from "./world-taxonomy-data";

const ALL_SUBS = new Set(getAllSubcategoryValues());

export const VERTICAL_ALIASES: Record<string, Vertical> = {
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
  drugstore: "healthcare",
  apothecary: "healthcare",
  mobility: "mobility",
  transport: "mobility",
  taxi: "mobility",
  ride: "mobility",
  driver: "mobility",
  courier: "mobility",
  car_rental: "mobility",
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

export const SUBCATEGORY_ALIASES: Record<string, string> = {
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
  pho: "vietnamese",
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

export function getCanonicalVertical(value: string): TaxonomyVertical | undefined {
  const norm = normalizeVertical(value);
  return CANONICAL_VERTICALS.find((v) => v.value === norm);
}

export function getCanonicalSubcategory(value: string): TaxonomySubcategory | undefined {
  const norm = normalizeSubcategory(value);
  if (!norm) return undefined;
  for (const vertical of CANONICAL_VERTICALS) {
    const found = vertical.subcategories.find((s) => s.value === norm);
    if (found) return found;
  }
  return undefined;
}

export function getParentVertical(subValue: string): TaxonomyVertical | undefined {
  const norm = normalizeSubcategory(subValue);
  if (!norm) return undefined;
  return CANONICAL_VERTICALS.find((v) =>
    v.subcategories.some((s) => s.value === norm)
  );
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
