/**
 * Taxonomy Mapper — Maps raw source categories to canonical Family→Category→Subcategory.
 * Strict per-vertical rules. Zero ambiguity.
 */
import type { Vertical, TaxonomyNode, SourceEntityRecord } from "../types";

// ─── Family definitions per vertical ───
const VERTICAL_FAMILIES: Record<Vertical, string> = {
  food: "food_beverage",
  grocery: "retail_grocery",
  hotel: "hospitality",
  services: "professional_services",
  property: "real_estate",
};

// ─── Category mapping per vertical ───
const CATEGORY_MAP: Record<Vertical, Record<string, { category: string; subcategory: string }>> = {
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
  },
  hotel: {
    hotel: { category: "accommodation", subcategory: "hotel" },
    resort: { category: "accommodation", subcategory: "resort" },
    hostel: { category: "accommodation", subcategory: "hostel" },
    serviced_apartment: { category: "accommodation", subcategory: "serviced_apartment" },
    boutique_hotel: { category: "accommodation", subcategory: "boutique_hotel" },
    apart_hotel: { category: "accommodation", subcategory: "serviced_apartment" },
  },
  services: {
    salon: { category: "beauty", subcategory: "salon" },
    barber: { category: "beauty", subcategory: "barber" },
    spa: { category: "beauty", subcategory: "spa" },
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
};

// ─── Aliases for raw source categories ───
const CATEGORY_ALIASES: Record<string, string> = {
  "fast food": "fast_food",
  fastfood: "fast_food",
  "fried chicken": "fried_chicken",
  "coffee shop": "cafe",
  "ice cream": "desserts",
  "mini mart": "mini_mart",
  "organic store": "organic_store",
  "car wash": "car_wash",
  "car repair": "car_repair",
  "ac repair": "ac_repair",
  "pest control": "pest_control",
  "short stay": "short_stay",
  "serviced apartment": "serviced_apartment",
  "boutique hotel": "boutique_hotel",
  "apart hotel": "apart_hotel",
  fruits: "fruits_vegetables",
  vegetables: "fruits_vegetables",
  repair: "handyman",
  maintenance: "handyman",
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
      return {
        family,
        category: match.category,
        subcategory: match.subcategory,
        tags: [...new Set([...(record.categories ?? []), ...(record.subcategories ?? [])])],
        confidence: 85,
      };
    }
  }

  // Fallback: use vertical defaults
  const defaultCategories: Record<Vertical, { category: string; subcategory: string }> = {
    food: { category: "restaurant", subcategory: "general" },
    grocery: { category: "grocery_store", subcategory: "general" },
    hotel: { category: "accommodation", subcategory: "hotel" },
    services: { category: "general_services", subcategory: "general" },
    property: { category: "listing", subcategory: "general" },
  };

  const fallback = defaultCategories[vertical];
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
