/**
 * Taxonomy Mapper — Maps raw source categories to canonical Family→Category→Subcategory.
 * Strict per-vertical rules. Zero ambiguity.
 *
 * Alias resolution delegates to the canonical SUBCATEGORY_ALIASES from taxonomy-aliases.ts.
 * Import-specific aliases that don't exist in the canonical set are added here as overrides.
 */
import type { Vertical, TaxonomyNode, SourceEntityRecord } from "../types";
import { SUBCATEGORY_ALIASES } from "@/lib/taxonomy/taxonomy-aliases";

const VERTICAL_FAMILIES: Record<string, string> = {
  food: "food_beverage",
  grocery: "retail_grocery",
  stay: "hospitality",
  hotel: "hospitality",
  services: "professional_services",
  property: "real_estate",
  shops: "retail_shops",
  mobility: "transport",
  utility: "infrastructure",
  healthcare: "health_wellness",
  experiences: "entertainment_leisure",
  education: "education_training",
  finance: "financial_services",
};

// ─── Category mapping per vertical ───
const CATEGORY_MAP: Record<string, Record<string, { category: string; subcategory: string }>> = {
  food: {
    restaurant: { category: "restaurant", subcategory: "general" },
    fast_food: { category: "restaurant", subcategory: "fast_food" },
    pizza: { category: "restaurant", subcategory: "pizza" },
    burger: { category: "restaurant", subcategory: "burger" },
    sushi: { category: "restaurant", subcategory: "sushi" },
    shawarma: { category: "restaurant", subcategory: "shawarma" },
    fried_chicken: { category: "restaurant", subcategory: "fried_chicken" },
    cafe: { category: "cafe_bakery", subcategory: "cafe" },
    coffee: { category: "cafe_bakery", subcategory: "coffee" },
    bakery: { category: "cafe_bakery", subcategory: "bakery" },
    desserts: { category: "cafe_bakery", subcategory: "desserts" },
    beverages: { category: "cafe_bakery", subcategory: "beverages" },
    breakfast: { category: "restaurant", subcategory: "breakfast" },
    brunch: { category: "restaurant", subcategory: "brunch" },
    catering: { category: "catering", subcategory: "catering" },
    vietnamese: { category: "restaurant", subcategory: "vietnamese" },
    greek: { category: "restaurant", subcategory: "greek" },
    french: { category: "restaurant", subcategory: "french" },
    spanish: { category: "restaurant", subcategory: "spanish" },
    african: { category: "restaurant", subcategory: "african" },
    ethiopian: { category: "restaurant", subcategory: "ethiopian" },
    caribbean: { category: "restaurant", subcategory: "caribbean" },
    persian: { category: "restaurant", subcategory: "persian" },
    filipino: { category: "restaurant", subcategory: "filipino" },
    brazilian: { category: "restaurant", subcategory: "brazilian" },
    german: { category: "restaurant", subcategory: "german" },
    moroccan: { category: "restaurant", subcategory: "moroccan" },
    bbq: { category: "restaurant", subcategory: "bbq" },
    vegan: { category: "restaurant", subcategory: "vegan" },
    juice_bar: { category: "cafe_bakery", subcategory: "juice_bar" },
    food_truck: { category: "restaurant", subcategory: "food_truck" },
    ice_cream: { category: "cafe_bakery", subcategory: "ice_cream" },
    steakhouse: { category: "restaurant", subcategory: "steakhouse" },
    buffet: { category: "restaurant", subcategory: "buffet" },
    cloud_kitchen: { category: "restaurant", subcategory: "cloud_kitchen" },
    food_court: { category: "restaurant", subcategory: "food_court" },
    casual_dining: { category: "restaurant", subcategory: "casual_dining" },
    smoothie_bar: { category: "cafe_bakery", subcategory: "smoothie_bar" },
    tea_house: { category: "cafe_bakery", subcategory: "tea_house" },
    chocolate: { category: "cafe_bakery", subcategory: "chocolate" },
    pastry: { category: "cafe_bakery", subcategory: "pastry" },
    delivery_takeaway: { category: "restaurant", subcategory: "delivery_takeaway" },
    fine_dining: { category: "restaurant", subcategory: "fine_dining" },
    pakistani: { category: "restaurant", subcategory: "pakistani" },
    italian: { category: "restaurant", subcategory: "italian" },
    indian: { category: "restaurant", subcategory: "indian" },
    chinese: { category: "restaurant", subcategory: "chinese" },
    lebanese: { category: "restaurant", subcategory: "lebanese" },
    arabic: { category: "restaurant", subcategory: "arabic" },
    turkish: { category: "restaurant", subcategory: "turkish" },
    mexican: { category: "restaurant", subcategory: "mexican" },
    thai: { category: "restaurant", subcategory: "thai" },
    korean: { category: "restaurant", subcategory: "korean" },
    japanese: { category: "restaurant", subcategory: "japanese" },
    seafood: { category: "restaurant", subcategory: "seafood" },
    healthy: { category: "restaurant", subcategory: "healthy" },
    asian: { category: "restaurant", subcategory: "asian" },
    pasta: { category: "restaurant", subcategory: "pasta" },
  },
  grocery: {
    supermarket: { category: "grocery_store", subcategory: "supermarket" },
    mini_mart: { category: "grocery_store", subcategory: "mini_mart" },
    organic: { category: "grocery_store", subcategory: "organic" },
    organic_store: { category: "grocery_store", subcategory: "organic" },
    fruits_vegetables: { category: "fresh_market", subcategory: "fruits_vegetables" },
    butcher: { category: "fresh_market", subcategory: "butcher" },
    dairy: { category: "fresh_market", subcategory: "dairy" },
    beverages_store: { category: "grocery_store", subcategory: "beverages" },
    snacks: { category: "grocery_store", subcategory: "snacks" },
    frozen: { category: "grocery_store", subcategory: "frozen" },
    bakery_grocery: { category: "fresh_market", subcategory: "bakery_grocery" },
    baby_products: { category: "grocery_store", subcategory: "baby_products" },
    household: { category: "grocery_store", subcategory: "household" },
    personal_care: { category: "grocery_store", subcategory: "personal_care" },
    pet_food: { category: "grocery_store", subcategory: "pet_food" },
    fish_market: { category: "fresh_market", subcategory: "fish_market" },
    spices: { category: "grocery_store", subcategory: "spices" },
    health_food: { category: "grocery_store", subcategory: "health_food" },
    gourmet: { category: "grocery_store", subcategory: "gourmet" },
    water_delivery: { category: "grocery_store", subcategory: "water_delivery" },
  },
  hotel: {
    hotel: { category: "accommodation", subcategory: "hotel" },
    resort: { category: "accommodation", subcategory: "resort" },
    hostel: { category: "accommodation", subcategory: "hostel" },
    boutique_hotel: { category: "accommodation", subcategory: "boutique_hotel" },
    serviced_apartment: { category: "accommodation", subcategory: "serviced_apartment" },
    apart_hotel: { category: "accommodation", subcategory: "serviced_apartment" },
    holiday_rental: { category: "accommodation", subcategory: "holiday_rental" },
    short_stay: { category: "accommodation", subcategory: "short_stay" },
    motel: { category: "accommodation", subcategory: "motel" },
    bed_breakfast: { category: "accommodation", subcategory: "bed_breakfast" },
    glamping: { category: "accommodation", subcategory: "glamping" },
    eco_lodge: { category: "accommodation", subcategory: "eco_lodge" },
    budget_hotel: { category: "accommodation", subcategory: "budget_hotel" },
    luxury_hotel: { category: "accommodation", subcategory: "luxury_hotel" },
    desert_camp: { category: "accommodation", subcategory: "desert_camp" },
    unique_stay: { category: "accommodation", subcategory: "unique_stay" },
  },
  stay: {
    hotel: { category: "accommodation", subcategory: "hotel" },
    resort: { category: "accommodation", subcategory: "resort" },
    hostel: { category: "accommodation", subcategory: "hostel" },
    serviced_apartment: { category: "accommodation", subcategory: "serviced_apartment" },
    boutique_hotel: { category: "accommodation", subcategory: "boutique_hotel" },
    apart_hotel: { category: "accommodation", subcategory: "serviced_apartment" },
    holiday_rental: { category: "accommodation", subcategory: "holiday_rental" },
    short_stay: { category: "accommodation", subcategory: "short_stay" },
    budget_hotel: { category: "accommodation", subcategory: "budget_hotel" },
    luxury_hotel: { category: "accommodation", subcategory: "luxury_hotel" },
    desert_camp: { category: "accommodation", subcategory: "desert_camp" },
    unique_stay: { category: "accommodation", subcategory: "unique_stay" },
  },
  services: {
    salon: { category: "beauty", subcategory: "salon" },
    barber: { category: "beauty", subcategory: "barber" },
    spa: { category: "beauty", subcategory: "spa" },
    nails: { category: "beauty", subcategory: "nails" },
    makeup: { category: "beauty", subcategory: "makeup" },
    lashes: { category: "beauty", subcategory: "lashes" },
    tattoo: { category: "beauty", subcategory: "tattoo" },
    massage: { category: "beauty", subcategory: "massage" },
    cleaning: { category: "home_services", subcategory: "cleaning" },
    laundry: { category: "home_services", subcategory: "laundry" },
    plumbing: { category: "home_services", subcategory: "plumbing" },
    electrical: { category: "home_services", subcategory: "electrical" },
    ac_repair: { category: "home_services", subcategory: "ac_repair" },
    car_wash: { category: "auto_services", subcategory: "car_wash" },
    car_repair: { category: "auto_services", subcategory: "car_repair" },
    handyman: { category: "home_services", subcategory: "handyman" },
    pest_control: { category: "home_services", subcategory: "pest_control" },
    movers: { category: "home_services", subcategory: "movers" },
    tailoring: { category: "personal_services", subcategory: "tailoring" },
    tutoring: { category: "professional", subcategory: "tutoring" },
    legal: { category: "professional", subcategory: "legal" },
    fitness: { category: "wellness", subcategory: "fitness" },
    photography: { category: "professional", subcategory: "photography" },
    accounting: { category: "professional", subcategory: "accounting" },
    insurance: { category: "professional", subcategory: "insurance" },
    pet_grooming: { category: "home_services", subcategory: "pet_grooming" },
    gardening: { category: "home_services", subcategory: "gardening" },
    painting: { category: "home_services", subcategory: "painting" },
    interior_design: { category: "professional", subcategory: "interior_design" },
    key_cutting: { category: "home_services", subcategory: "key_cutting" },
    carpentry: { category: "home_services", subcategory: "carpentry" },
    it_support: { category: "professional", subcategory: "it_support" },
    mobile_repair: { category: "auto_services", subcategory: "mobile_repair" },
    printing: { category: "professional", subcategory: "printing" },
    consulting: { category: "professional", subcategory: "consulting" },
    marketing: { category: "professional", subcategory: "marketing" },
    hvac: { category: "home_services", subcategory: "hvac" },
    tire_service: { category: "auto_services", subcategory: "tire_service" },
    technician: { category: "home_services", subcategory: "technician" },
    delivery_service: { category: "home_services", subcategory: "delivery_service" },
  },
  property: {
    rent: { category: "residential", subcategory: "rent" },
    sale: { category: "residential", subcategory: "sale" },
    short_stay: { category: "residential", subcategory: "short_stay" },
    commercial_lease: { category: "commercial", subcategory: "lease" },
    villa: { category: "residential", subcategory: "villa" },
    apartment: { category: "residential", subcategory: "apartment" },
    office: { category: "commercial", subcategory: "office" },
  },
  shops: {
    fashion: { category: "fashion", subcategory: "clothing" },
    electronics: { category: "electronics", subcategory: "gadgets" },
    jewelry: { category: "luxury", subcategory: "jewelry" },
    footwear: { category: "fashion", subcategory: "shoes" },
    home_decor: { category: "home", subcategory: "decor" },
    perfume: { category: "beauty", subcategory: "fragrance" },
    toys: { category: "family", subcategory: "toys" },
    sports: { category: "sports", subcategory: "equipment" },
    books: { category: "media", subcategory: "books" },
    general: { category: "retail", subcategory: "general" },
    wholesale: { category: "retail", subcategory: "wholesale" },
    digital_products: { category: "retail", subcategory: "digital_products" },
  },
  mobility: {
    taxi: { category: "rideshare", subcategory: "taxi" },
    chauffeur: { category: "rideshare", subcategory: "chauffeur" },
    rental: { category: "vehicle_rental", subcategory: "car" },
    bus: { category: "public_transport", subcategory: "bus" },
    metro: { category: "public_transport", subcategory: "metro" },
    scooter: { category: "micro_mobility", subcategory: "scooter" },
    courier: { category: "logistics", subcategory: "courier" },
    freight: { category: "logistics", subcategory: "freight" },
  },
  utility: {
    atm: { category: "finance", subcategory: "atm" },
    fuel: { category: "automotive", subcategory: "fuel" },
    pharmacy: { category: "health", subcategory: "pharmacy" },
    parking: { category: "automotive", subcategory: "parking" },
    ev_charger: { category: "automotive", subcategory: "ev_charger" },
  },
  healthcare: {
    hospital: { category: "medical", subcategory: "hospital" },
    clinic: { category: "medical", subcategory: "clinic" },
    dental: { category: "medical", subcategory: "dental" },
    pharmacy: { category: "medical", subcategory: "pharmacy" },
    lab: { category: "medical", subcategory: "lab" },
    optical: { category: "medical", subcategory: "optical" },
    physio: { category: "medical", subcategory: "physio" },
    dentist: { category: "medical", subcategory: "dental" },
    veterinary: { category: "medical", subcategory: "veterinary" },
    mental_health: { category: "medical", subcategory: "mental_health" },
    dermatology: { category: "medical", subcategory: "dermatology" },
    pediatrics: { category: "medical", subcategory: "pediatrics" },
  },
  experiences: {
    theme_park: { category: "entertainment", subcategory: "theme_park" },
    museum: { category: "culture", subcategory: "museum" },
    concert: { category: "events", subcategory: "concert" },
    desert_safari: { category: "adventure", subcategory: "safari" },
    water_sports: { category: "adventure", subcategory: "water_sports" },
    tour: { category: "tourism", subcategory: "city_tour" },
    cruise: { category: "tourism", subcategory: "cruise" },
    safari: { category: "adventure", subcategory: "safari" },
    diving: { category: "adventure", subcategory: "diving" },
    ski: { category: "adventure", subcategory: "ski" },
    hiking: { category: "adventure", subcategory: "hiking" },
    city_tour: { category: "tourism", subcategory: "city_tour" },
    flights: { category: "tourism", subcategory: "flights" },
    activities: { category: "entertainment", subcategory: "activities" },
    events: { category: "events", subcategory: "events" },
    cinema: { category: "entertainment", subcategory: "cinema" },
    sports: { category: "entertainment", subcategory: "sports" },
    tourism: { category: "tourism", subcategory: "tourism" },
  },
  education: {
    k12_school: { category: "institution", subcategory: "k12_school" },
    university: { category: "institution", subcategory: "university" },
    courses: { category: "learning", subcategory: "courses" },
    coaching: { category: "learning", subcategory: "coaching" },
    online_learning: { category: "learning", subcategory: "online_learning" },
    language_school: { category: "learning", subcategory: "language_school" },
    driving_school: { category: "learning", subcategory: "driving_school" },
    daycare: { category: "institution", subcategory: "daycare" },
    vocational: { category: "learning", subcategory: "vocational" },
    music_school: { category: "learning", subcategory: "music_school" },
  },
  finance: {
    payments: { category: "fintech", subcategory: "payments" },
    transfers: { category: "fintech", subcategory: "transfers" },
    banking: { category: "banking", subcategory: "banking" },
    insurance_finance: { category: "banking", subcategory: "insurance" },
    exchange: { category: "fintech", subcategory: "exchange" },
    crypto: { category: "fintech", subcategory: "crypto" },
    investment_finance: { category: "banking", subcategory: "investment" },
    microfinance: { category: "banking", subcategory: "microfinance" },
  },
};

// ─── Aliases for raw source categories ───
// Import-specific overrides that supplement the canonical SUBCATEGORY_ALIASES.
// The canonical aliases from taxonomy-aliases.ts are used as the base; these
// add import-pipeline-specific mappings that don't belong in the global set.
const IMPORT_SPECIFIC_ALIASES: Record<string, string> = {
  gelato: "ice_cream",
  "frozen yogurt": "ice_cream",
  convenience: "mini_mart",
  "convenience store": "mini_mart",
  fruits: "fruits_vegetables",
  vegetables: "fruits_vegetables",
  "gourmet burger": "burger",
  "fish and chips": "seafood",
  "fish & chips": "seafood",
  "raw food": "vegan",
  "food cart": "food_truck",
  "gnc": "health_food",
  "food hall": "food_court",
  "matcha bar": "tea_house",
  "chai shop": "tea_house",
  "economy hotel": "budget_hotel",
  "five star hotel": "luxury_hotel",
  "e-bike": "scooter",
  "electric scooter": "scooter",
  "movie theater": "cinema",
  "movie theatre": "cinema",
  theater: "cinema",
  gym: "sports",
  "fitness center": "sports",
  "auto school": "driving_school",
  nursery: "daycare",
  preschool: "daycare",
  kindergarten: "daycare",
  college: "university",
  "trade school": "vocational",
  "art school": "music_school",
  "dance school": "music_school",
  "money exchange": "exchange",
  "currency exchange": "exchange",
  remittance: "transfers",
  "mobile money": "payments",
  blockchain: "crypto",
  "micro loan": "microfinance",
  "tyre shop": "tire_service",
  advisor: "consulting",
  "advertising agency": "marketing",
};

const CATEGORY_ALIASES: Record<string, string> = {
  ...SUBCATEGORY_ALIASES,
  ...IMPORT_SPECIFIC_ALIASES,
};

function normalizeKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function resolveAlias(raw: string): string {
  const norm = normalizeKey(raw);
  return CATEGORY_ALIASES[norm] ?? norm;
}

/**
 * Map a source entity record to canonical taxonomy.
 */
export function mapToTaxonomy(record: SourceEntityRecord): TaxonomyNode {
  const vertical = record.vertical;
  const family = VERTICAL_FAMILIES[vertical] ?? "unknown";
  const verticalMap = CATEGORY_MAP[vertical] ?? {};

  // Try each raw category/subcategory
  const candidates = [
    ...(record.subcategories ?? []),
    ...(record.categories ?? []),
  ].map(resolveAlias);

  for (const key of candidates) {
    const match = verticalMap[key];
    if (match) {
      const wasAlias = key !== candidates[0];
      return {
        family,
        category: match.category,
        subcategory: match.subcategory,
        tags: [...new Set([...(record.categories ?? []), ...(record.subcategories ?? [])])],
        confidence: wasAlias ? 75 : 85,
      };
    }
  }

  // Fallback: use vertical defaults
  const defaultCategories: Record<string, { category: string; subcategory: string }> = {
    food: { category: "restaurant", subcategory: "general" },
    grocery: { category: "grocery_store", subcategory: "general" },
    stay: { category: "accommodation", subcategory: "hotel" },
    hotel: { category: "accommodation", subcategory: "hotel" },
    services: { category: "general_services", subcategory: "general" },
    property: { category: "listing", subcategory: "general" },
    shops: { category: "retail", subcategory: "general" },
    mobility: { category: "transport", subcategory: "taxi" },
    utility: { category: "utility", subcategory: "general" },
    healthcare: { category: "health", subcategory: "general" },
    experiences: { category: "entertainment", subcategory: "general" },
    education: { category: "institution", subcategory: "general" },
    finance: { category: "fintech", subcategory: "general" },
  };

  const fallback = defaultCategories[vertical] ?? { category: "general", subcategory: "general" };
  return {
    family,
    category: fallback.category,
    subcategory: fallback.subcategory,
    tags: [...new Set([...(record.categories ?? []), ...(record.subcategories ?? [])])],
    confidence: 30,
  };
}

/**
 * Validate taxonomy node completeness.
 */
export function isTaxonomyComplete(t: TaxonomyNode): boolean {
  return !!t.family && !!t.category && !!t.subcategory && t.confidence >= 50;
}
