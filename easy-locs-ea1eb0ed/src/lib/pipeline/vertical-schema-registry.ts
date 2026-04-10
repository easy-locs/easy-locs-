/**
 * ADAPTIVE VERTICAL SCHEMA REGISTRY
 * Central source of truth for what each vertical/subcategory requires.
 * No new engines — this is a pure data registry consumed by existing engines.
 */

export interface VerticalSchema {
  vertical: string;
  label: string;
  requiredFields: string[];
  optionalFields: string[];
  publishGate: string;
  qualityMinScore: number;
  menuRequired: boolean;
  minMenuItems: number;
  backendModules: string[];
  publicLayout: string;
  filters: string[];
  actionButtons: string[];
  digitalContentRules: string[];
  subcategories: SubcategorySchema[];
}

export interface SubcategorySchema {
  value: string;
  label: string;
  extraRequiredFields?: string[];
  extraFilters?: string[];
  minMenuItems?: number;
}

// ═══════════════════════════════════════════════════
//  VERTICAL DEFINITIONS
// ═══════════════════════════════════════════════════

const FOOD_SCHEMA: VerticalSchema = {
  vertical: "food",
  label: "Food & Restaurants",
  requiredFields: ["name", "category", "subcategory", "city", "country", "cover_image", "menu_items_json", "latitude", "longitude"],
  optionalFields: ["phone", "description", "logo_image", "delivery_time_min", "delivery_time_max", "minimum_order", "currency"],
  publishGate: "publish-gate-food",
  qualityMinScore: 50,
  menuRequired: true,
  minMenuItems: 3,
  backendModules: ["menu-builder", "order-queue", "delivery-zones", "offers", "prep-time", "variants", "addons"],
  publicLayout: "food-storefront",
  filters: ["cuisine", "price_range", "delivery_time", "rating", "open_now", "offers", "dietary"],
  actionButtons: ["order", "chat", "call", "share", "favorite"],
  digitalContentRules: ["trending_food", "best_restaurants", "open_now", "near_you", "new_arrivals"],
  subcategories: [
    { value: "pizza", label: "Pizza" },
    { value: "burger", label: "Burger" },
    { value: "sushi", label: "Sushi & Japanese" },
    { value: "bakery", label: "Bakery & Pastry" },
    { value: "cafe", label: "Café & Coffee" },
    { value: "indian", label: "Indian" },
    { value: "chinese", label: "Chinese" },
    { value: "mexican", label: "Mexican" },
    { value: "thai", label: "Thai" },
    { value: "lebanese", label: "Lebanese" },
    { value: "italian", label: "Italian" },
    { value: "seafood", label: "Seafood" },
    { value: "desserts", label: "Desserts & Sweets" },
    { value: "healthy", label: "Healthy & Salads" },
    { value: "fast_food", label: "Fast Food" },
    { value: "arabic", label: "Arabic" },
    { value: "steakhouse", label: "Steakhouse" },
    { value: "breakfast", label: "Breakfast" },
    { value: "juice_bar", label: "Juice & Smoothies" },
    { value: "ice_cream", label: "Ice Cream" },
  ],
};

const HOTEL_SCHEMA: VerticalSchema = {
  vertical: "hotel",
  label: "Hotels & Accommodation",
  requiredFields: ["name", "category", "subcategory", "city", "country", "cover_image", "latitude", "longitude"],
  optionalFields: ["phone", "description", "logo_image", "star_rating", "amenities_json", "check_in_time", "check_out_time"],
  publishGate: "publish-gate-hotel",
  qualityMinScore: 50,
  menuRequired: false,
  minMenuItems: 0,
  backendModules: ["room-inventory", "room-types", "amenities", "nightly-pricing", "availability", "booking-rules", "check-in-out"],
  publicLayout: "hotel-storefront",
  filters: ["star_rating", "price_range", "amenities", "room_type", "check_in", "check_out", "guests"],
  actionButtons: ["book", "chat", "call", "share", "favorite"],
  digitalContentRules: ["best_hotels", "luxury_stays", "budget_friendly", "near_you", "weekend_deals"],
  subcategories: [
    { value: "hotel", label: "Hotel" },
    { value: "resort", label: "Resort" },
    { value: "hostel", label: "Hostel" },
    { value: "serviced_apartment", label: "Serviced Apartment" },
    { value: "boutique_hotel", label: "Boutique Hotel" },
    { value: "villa", label: "Villa" },
    { value: "guesthouse", label: "Guest House" },
    { value: "motel", label: "Motel" },
  ],
};

const SERVICES_SCHEMA: VerticalSchema = {
  vertical: "services",
  label: "Services & Professionals",
  requiredFields: ["name", "category", "subcategory", "city", "country", "cover_image", "latitude", "longitude"],
  optionalFields: ["phone", "description", "logo_image", "service_radius_km", "pricing_json"],
  publishGate: "publish-gate-service",
  qualityMinScore: 45,
  menuRequired: false,
  minMenuItems: 0,
  backendModules: ["service-catalog", "appointment-slots", "pricing", "quote-requests", "staff-scheduling", "service-radius"],
  publicLayout: "service-storefront",
  filters: ["service_type", "price_range", "rating", "availability", "distance"],
  actionButtons: ["book", "request_quote", "chat", "call", "share"],
  digitalContentRules: ["top_rated_services", "near_you", "new_providers", "verified_pros"],
  subcategories: [
    { value: "salon", label: "Salon & Beauty" },
    { value: "spa", label: "Spa & Wellness" },
    { value: "plumber", label: "Plumber" },
    { value: "electrician", label: "Electrician" },
    { value: "clinic", label: "Clinic & Medical" },
    { value: "legal", label: "Legal Services" },
    { value: "cleaning", label: "Cleaning" },
    { value: "fitness", label: "Fitness & Gym" },
    { value: "automotive", label: "Automotive" },
    { value: "education", label: "Education & Tutoring" },
    { value: "photography", label: "Photography" },
    { value: "pet_services", label: "Pet Services" },
  ],
};

const GROCERY_SCHEMA: VerticalSchema = {
  vertical: "grocery",
  label: "Grocery & Retail",
  requiredFields: ["name", "category", "subcategory", "city", "country", "cover_image", "latitude", "longitude"],
  optionalFields: ["phone", "description", "logo_image", "delivery_time_min"],
  publishGate: "publish-gate-grocery",
  qualityMinScore: 45,
  menuRequired: false,
  minMenuItems: 0,
  backendModules: ["product-catalog", "stock", "variants", "promotions", "substitution-rules", "basket-logic"],
  publicLayout: "grocery-storefront",
  filters: ["product_type", "price_range", "brand", "organic", "offers", "delivery_time"],
  actionButtons: ["order", "chat", "call", "share", "favorite"],
  digitalContentRules: ["weekly_deals", "fresh_arrivals", "best_sellers", "near_you"],
  subcategories: [
    { value: "supermarket", label: "Supermarket" },
    { value: "minimart", label: "Minimart" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "specialty_store", label: "Specialty Store" },
    { value: "organic", label: "Organic & Health" },
    { value: "pet_store", label: "Pet Store" },
    { value: "liquor", label: "Liquor Store" },
  ],
};

const MOBILITY_SCHEMA: VerticalSchema = {
  vertical: "mobility",
  label: "Mobility & Delivery",
  requiredFields: ["name", "category", "subcategory", "city", "country"],
  optionalFields: ["phone", "description", "cover_image", "vehicle_type", "zones_json"],
  publishGate: "publish-gate-service",
  qualityMinScore: 40,
  menuRequired: false,
  minMenuItems: 0,
  backendModules: ["availability", "zones", "job-feed", "route-logic", "proof-of-delivery", "earnings"],
  publicLayout: "mobility-profile",
  filters: ["vehicle_type", "availability", "zone", "rating"],
  actionButtons: ["request", "chat", "call", "track"],
  digitalContentRules: ["available_now", "top_rated_drivers"],
  subcategories: [
    { value: "biker", label: "Biker" },
    { value: "driver", label: "Driver" },
    { value: "taxi", label: "Taxi" },
    { value: "delivery_rider", label: "Delivery Rider" },
  ],
};

const TRAVEL_SCHEMA: VerticalSchema = {
  vertical: "travel",
  label: "Travel & Tourism",
  requiredFields: ["name", "category", "subcategory", "city", "country", "cover_image"],
  optionalFields: ["phone", "description", "logo_image", "latitude", "longitude"],
  publishGate: "publish-gate-service",
  qualityMinScore: 45,
  menuRequired: false,
  minMenuItems: 0,
  backendModules: ["schedule", "classes", "baggage", "seat-route-logic", "reservation-flow"],
  publicLayout: "travel-storefront",
  filters: ["destination", "price_range", "date", "duration", "class"],
  actionButtons: ["book", "chat", "call", "share"],
  digitalContentRules: ["trending_destinations", "weekend_getaways", "best_deals"],
  subcategories: [
    { value: "flights", label: "Flights" },
    { value: "routes", label: "Routes" },
    { value: "transfer", label: "Transfer" },
    { value: "tourism_packages", label: "Tourism Packages" },
    { value: "tours", label: "Tours & Activities" },
  ],
};

// ═══════════════════════════════════════════════════
//  REGISTRY API
// ═══════════════════════════════════════════════════

const ALL_SCHEMAS: VerticalSchema[] = [
  FOOD_SCHEMA, HOTEL_SCHEMA, SERVICES_SCHEMA, 
  GROCERY_SCHEMA, MOBILITY_SCHEMA, TRAVEL_SCHEMA,
];

const SCHEMA_MAP = new Map<string, VerticalSchema>();
for (const s of ALL_SCHEMAS) SCHEMA_MAP.set(s.vertical, s);

export function getVerticalSchema(vertical: string): VerticalSchema | null {
  return SCHEMA_MAP.get(vertical.toLowerCase()) ?? null;
}

export function getAllVerticalSchemas(): VerticalSchema[] {
  return ALL_SCHEMAS;
}

export function getSubcategorySchema(vertical: string, subcategory: string): SubcategorySchema | null {
  const vs = getVerticalSchema(vertical);
  if (!vs) return null;
  return vs.subcategories.find(s => s.value === subcategory.toLowerCase()) ?? null;
}

export function getRequiredFields(vertical: string): string[] {
  return getVerticalSchema(vertical)?.requiredFields ?? ["name", "city", "country"];
}

export function getBackendModules(vertical: string): string[] {
  return getVerticalSchema(vertical)?.backendModules ?? [];
}

export function getPublishGate(vertical: string): string {
  return getVerticalSchema(vertical)?.publishGate ?? "strict-quality-gate";
}

export function getQualityMinScore(vertical: string): number {
  return getVerticalSchema(vertical)?.qualityMinScore ?? 50;
}

export function isMenuRequired(vertical: string): boolean {
  return getVerticalSchema(vertical)?.menuRequired ?? false;
}

export function getMinMenuItems(vertical: string): number {
  return getVerticalSchema(vertical)?.minMenuItems ?? 0;
}

export function getFiltersForVertical(vertical: string): string[] {
  return getVerticalSchema(vertical)?.filters ?? [];
}

export function getActionButtonsForVertical(vertical: string): string[] {
  return getVerticalSchema(vertical)?.actionButtons ?? [];
}

/**
 * Validate entity completeness against its vertical schema.
 * Returns missing required fields.
 */
export function validateEntityCompleteness(entity: Record<string, any>, vertical: string): {
  complete: boolean;
  missingFields: string[];
  completenessScore: number;
} {
  const schema = getVerticalSchema(vertical);
  if (!schema) return { complete: false, missingFields: ["unknown_vertical"], completenessScore: 0 };

  const missing: string[] = [];
  for (const field of schema.requiredFields) {
    const val = entity[field];
    if (val == null || val === "" || val === "unknown" || val === "general" || val === "other") {
      missing.push(field);
    }
  }

  // Check menu requirement
  if (schema.menuRequired) {
    const menuItems = Array.isArray(entity.menu_items_json) ? entity.menu_items_json : [];
    const flatItems = menuItems.flatMap((s: any) => s?.items || [s]).filter(Boolean);
    if (flatItems.length < schema.minMenuItems) {
      missing.push(`menu_items (min ${schema.minMenuItems})`);
    }
  }

  const totalRequired = schema.requiredFields.length + (schema.menuRequired ? 1 : 0);
  const completenessScore = Math.round(((totalRequired - missing.length) / totalRequired) * 100);

  return {
    complete: missing.length === 0,
    missingFields: missing,
    completenessScore,
  };
}

/**
 * Engine Rationalization Map — classifies all engines into pipeline stages.
 */
export const ENGINE_RATIONALIZATION_MAP: Record<string, {
  stage: string;
  layer: string;
  status: "keep" | "merge" | "disable" | "reassign";
  mergedInto?: string;
  responsibility: string;
}> = {
  // A. SOURCE / IMPORT
  "source-intake-engine": { stage: "source", layer: "toolbox", status: "keep", responsibility: "Raw data snapshot from imports" },
  "source-rescrape-monitor": { stage: "source", layer: "sensor", status: "keep", responsibility: "Monitor stale sources for re-scraping" },
  "growth-domination-engine": { stage: "source", layer: "toolbox", status: "keep", responsibility: "Market expansion + new entity discovery" },

  // B. NORMALIZATION / REPAIR
  "vertical-classifier-engine": { stage: "classify", layer: "toolbox", status: "keep", responsibility: "Assign vertical + subcategory" },
  "shop-cleanup-engine": { stage: "clean", layer: "toolbox", status: "keep", responsibility: "Remove junk data + standardize fields" },
  "franchise-dedup-engine": { stage: "clean", layer: "toolbox", status: "keep", responsibility: "Multi-signal deduplication" },
  "shop-backend-repair-engine": { stage: "clean", layer: "mechanic", status: "keep", responsibility: "Auto-fill missing defaults" },
  "food-menu-normalizer-engine": { stage: "normalize", layer: "toolbox", status: "keep", responsibility: "Food menu structure normalization" },
  "hotel-inventory-normalizer-engine": { stage: "normalize", layer: "toolbox", status: "keep", responsibility: "Hotel room/inventory normalization" },
  "service-catalog-normalizer-engine": { stage: "normalize", layer: "toolbox", status: "keep", responsibility: "Service catalog normalization" },
  "grocery-normalizer-engine": { stage: "normalize", layer: "toolbox", status: "keep", responsibility: "Grocery product catalog normalization" },
  "menu-rebuild-engine": { stage: "rebuild", layer: "toolbox", status: "keep", responsibility: "Reconstruct canonical menus for food" },
  "menu-intelligence-engine": { stage: "rebuild", layer: "toolbox", status: "merge", mergedInto: "menu-rebuild-engine", responsibility: "Menu analytics (merged into rebuild)" },

  // C. QUALITY / GATE
  "category-mapping-engine": { stage: "enrich", layer: "toolbox", status: "keep", responsibility: "Map to canonical categories" },
  "adaptive-taxonomy-engine": { stage: "enrich", layer: "toolbox", status: "keep", responsibility: "Dynamic taxonomy enrichment" },
  "data-completeness-engine": { stage: "enrich", layer: "sensor", status: "keep", responsibility: "Compute field completeness scores" },
  "shop-quality-engine": { stage: "score", layer: "toolbox", status: "keep", responsibility: "Compute overall quality score" },
  "data-trust-engine": { stage: "score", layer: "sensor", status: "keep", responsibility: "Source confidence scoring" },
  "strict-quality-gate-engine": { stage: "validate", layer: "toolbox", status: "keep", responsibility: "Master validation gate" },
  "publish-gate-food-engine": { stage: "validate", layer: "toolbox", status: "keep", responsibility: "Food-specific publish validation" },
  "publish-gate-hotel-engine": { stage: "validate", layer: "toolbox", status: "keep", responsibility: "Hotel-specific publish validation" },
  "publish-gate-service-engine": { stage: "validate", layer: "toolbox", status: "keep", responsibility: "Service-specific publish validation" },
  "publish-gate-grocery-engine": { stage: "validate", layer: "toolbox", status: "keep", responsibility: "Grocery-specific publish validation" },
  "publish-gate-engine": { stage: "validate", layer: "toolbox", status: "merge", mergedInto: "strict-quality-gate-engine", responsibility: "Generic gate (merged into strict)" },
  "food-quality-engine": { stage: "validate", layer: "sensor", status: "merge", mergedInto: "publish-gate-food-engine", responsibility: "Food quality (merged into food gate)" },

  // D. EXPERIENCE / BUSINESS
  "auto-publish-engine": { stage: "publish", layer: "mechanic", status: "keep", responsibility: "Auto-transition to live" },
  "auto-unpublish-engine": { stage: "publish", layer: "mechanic", status: "keep", responsibility: "Auto-hide failing entities" },
  "visibility-optimizer-engine": { stage: "publish", layer: "mechanic", status: "keep", responsibility: "Optimize visibility_mode per score" },
  "central-ranking": { stage: "distribute", layer: "toolbox", status: "keep", responsibility: "Global ranking score computation" },
  "seo-engine": { stage: "distribute", layer: "toolbox", status: "keep", responsibility: "SEO metadata generation" },

  // E. DIGITAL CONTENT
  "digital-orchestration-engine": { stage: "digital", layer: "toolbox", status: "keep", responsibility: "Homepage/category dynamic content" },
  "content-freshness-engine": { stage: "digital", layer: "sensor", status: "keep", responsibility: "Content rotation freshness" },
  "campaign-banner-engine": { stage: "digital", layer: "toolbox", status: "keep", responsibility: "Banner campaign management" },
  "social-proof-engine": { stage: "digital", layer: "toolbox", status: "keep", responsibility: "Social proof signals" },

  // F. ORCHESTRATION / SUPERVISION
  "platform-recovery-engine": { stage: "supervision", layer: "chief", status: "keep", responsibility: "Self-healing recovery" },
  "self-healing-engine": { stage: "supervision", layer: "chief", status: "keep", responsibility: "Auto-fix broken states" },
  "entity-recovery-engine": { stage: "supervision", layer: "mechanic", status: "keep", responsibility: "Recover incorrectly hidden entities" },
  "coherence-gate": { stage: "validate", layer: "sensor", status: "keep", responsibility: "Name-category coherence check" },
};
