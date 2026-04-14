import type { CanonicalVertical } from "@/domains/shared/canonical-types";

export interface VerticalBoundary {
  vertical: CanonicalVertical;
  allowedCategories: string[];
  allowedSubcategories: string[];
  allowedCardTemplates: string[];
  allowedMediaKinds: string[];
  allowedEventPrefixes: string[];
  forbiddenCrossReferences: CanonicalVertical[];
}

const VERTICAL_BOUNDARIES: Record<string, VerticalBoundary> = {
  food: {
    vertical: "food",
    allowedCategories: ["restaurant", "cafe", "cloud_kitchen", "catering", "food_truck", "bakery", "juice_bar"],
    allowedSubcategories: ["fine_dining", "casual_dining", "fast_food", "cuisine", "coffee_shop", "bakery", "juice_bar", "cloud_kitchen"],
    allowedCardTemplates: ["RestaurantCard", "CafeCard"],
    allowedMediaKinds: ["exterior", "interior", "dish", "menu", "logo", "cover", "gallery"],
    allowedEventPrefixes: ["food:", "storefront:"],
    forbiddenCrossReferences: ["property", "flight", "mobility"],
  },
  stay: {
    vertical: "stay",
    allowedCategories: ["hotel", "aparthotel", "holiday_rental", "hostel", "camping"],
    allowedSubcategories: ["business_hotel", "boutique_hotel", "resort", "serviced_apartment", "holiday_home"],
    allowedCardTemplates: ["HotelCard"],
    allowedMediaKinds: ["facade", "lobby", "room", "bathroom", "pool", "amenities", "landscape", "logo", "cover", "gallery"],
    allowedEventPrefixes: ["stay:", "hotel:"],
    forbiddenCrossReferences: ["food", "mobility", "delivery"],
  },
  healthcare: {
    vertical: "healthcare",
    allowedCategories: ["clinic", "hospital", "pharmacy", "lab", "physiotherapy", "optical"],
    allowedSubcategories: ["general", "dental", "dermatology", "ophthalmology", "general_hospital", "retail_pharmacy", "diagnostic_lab"],
    allowedCardTemplates: ["ClinicCard", "HospitalCard"],
    allowedMediaKinds: ["building", "reception", "treatment_room", "equipment", "logo", "cover"],
    allowedEventPrefixes: ["healthcare:", "clinic:"],
    forbiddenCrossReferences: ["food", "mobility", "flight"],
  },
  beauty: {
    vertical: "beauty",
    allowedCategories: ["gym", "personal_training", "spa", "salon", "barber", "nail_salon", "skincare"],
    allowedSubcategories: ["general_gym", "crossfit", "yoga_studio", "pilates_studio", "personal_trainer", "day_spa", "massage", "hair_salon", "barber_shop", "nail_studio"],
    allowedCardTemplates: ["GymCard", "BeautyCard", "ServiceCard"],
    allowedMediaKinds: ["entrance", "gym_floor", "machines", "studio", "locker", "reception", "logo", "cover"],
    allowedEventPrefixes: ["beauty:", "wellness:"],
    forbiddenCrossReferences: ["property", "flight", "delivery"],
  },
  grocery: {
    vertical: "grocery",
    allowedCategories: ["supermarket", "mini_mart", "organic", "wholesale", "hypermarket", "convenience"],
    allowedSubcategories: ["supermarket", "mini_mart", "organic_store", "wholesale_club", "hypermarket"],
    allowedCardTemplates: ["GroceryCard", "ShopCard"],
    allowedMediaKinds: ["exterior", "interior", "product", "storefront", "logo", "cover"],
    allowedEventPrefixes: ["grocery:", "storefront:"],
    forbiddenCrossReferences: ["property", "flight", "healthcare"],
  },
  mobility: {
    vertical: "mobility",
    allowedCategories: ["taxi", "chauffeur", "rental", "bus", "metro", "ride_hailing", "bike_rental"],
    allowedSubcategories: ["economy", "comfort", "premium", "xl", "moto", "van", "luxury"],
    allowedCardTemplates: ["TaxiCard"],
    allowedMediaKinds: ["vehicle", "driver_portrait", "logo"],
    allowedEventPrefixes: ["mobility:", "ride:", "dispatch:", "tracking:"],
    forbiddenCrossReferences: ["property", "healthcare", "education"],
  },
  property: {
    vertical: "property",
    allowedCategories: ["residential", "commercial", "land", "industrial"],
    allowedSubcategories: ["apartment", "villa", "townhouse", "studio", "penthouse", "office", "retail_space", "warehouse"],
    allowedCardTemplates: ["PropertyCard"],
    allowedMediaKinds: ["facade", "room", "bathroom", "pool", "amenities", "listing_hero", "floor_plan", "neighborhood", "logo", "cover"],
    allowedEventPrefixes: ["property:", "pm:", "listing:"],
    forbiddenCrossReferences: ["food", "mobility", "delivery"],
  },
  services: {
    vertical: "services",
    allowedCategories: ["home_services", "professional", "freelance", "repair", "cleaning", "tutoring"],
    allowedSubcategories: ["plumber", "electrician", "painter", "carpenter", "ac_repair", "lawyer", "accountant", "consultant", "photographer"],
    allowedCardTemplates: ["ServiceCard"],
    allowedMediaKinds: ["exterior", "interior", "logo", "cover", "gallery"],
    allowedEventPrefixes: ["services:", "booking:"],
    forbiddenCrossReferences: ["flight", "property"],
  },
  flight: {
    vertical: "flight",
    allowedCategories: ["commercial", "charter", "private"],
    allowedSubcategories: ["economy", "premium_economy", "business", "first"],
    allowedCardTemplates: ["GenericCard"],
    allowedMediaKinds: ["logo", "cover"],
    allowedEventPrefixes: ["flight:"],
    forbiddenCrossReferences: ["food", "property", "healthcare", "beauty"],
  },
  retail: {
    vertical: "retail",
    allowedCategories: ["fashion", "electronics", "jewelry", "general", "specialty", "bookstore"],
    allowedSubcategories: ["clothing", "shoes", "accessories", "phones", "computers", "watches", "rings"],
    allowedCardTemplates: ["ShopCard"],
    allowedMediaKinds: ["exterior", "interior", "product", "storefront", "window_display", "logo", "cover"],
    allowedEventPrefixes: ["retail:", "storefront:"],
    forbiddenCrossReferences: ["healthcare", "flight", "property"],
  },
  education: {
    vertical: "education",
    allowedCategories: ["school", "university", "tutoring", "online_course", "training", "certification"],
    allowedSubcategories: ["primary", "secondary", "undergraduate", "postgraduate", "professional", "language", "test_prep"],
    allowedCardTemplates: ["ServiceCard", "GenericCard"],
    allowedMediaKinds: ["building", "reception", "logo", "cover"],
    allowedEventPrefixes: ["education:"],
    forbiddenCrossReferences: ["food", "mobility", "delivery"],
  },
  events: {
    vertical: "events",
    allowedCategories: ["concert", "conference", "exhibition", "sports_event", "festival", "workshop"],
    allowedSubcategories: ["live_music", "tech_conference", "art_exhibition", "football", "food_festival", "coding_workshop"],
    allowedCardTemplates: ["ExperienceCard", "GenericCard"],
    allowedMediaKinds: ["event_venue", "activity", "landscape", "logo", "cover"],
    allowedEventPrefixes: ["events:"],
    forbiddenCrossReferences: ["property", "healthcare"],
  },
  experiences: {
    vertical: "experiences",
    allowedCategories: ["theme_park", "museum", "tour", "adventure", "water_sports", "desert_safari", "cinema"],
    allowedSubcategories: ["roller_coaster", "guided_tour", "scuba_diving", "skydiving", "cultural_tour"],
    allowedCardTemplates: ["ExperienceCard"],
    allowedMediaKinds: ["event_venue", "activity", "landscape", "logo", "cover", "gallery"],
    allowedEventPrefixes: ["experiences:"],
    forbiddenCrossReferences: ["property", "healthcare", "delivery"],
  },
  utility: {
    vertical: "utility",
    allowedCategories: ["atm", "fuel", "pharmacy", "parking", "ev_charger", "post_office", "bank"],
    allowedSubcategories: ["cash_withdrawal", "petrol", "diesel", "electric", "indoor_parking", "outdoor_parking"],
    allowedCardTemplates: ["UtilityCard", "GenericCard"],
    allowedMediaKinds: ["exterior", "atm_machine", "fuel_station", "parking_lot", "pharmacy_front", "logo"],
    allowedEventPrefixes: ["utility:"],
    forbiddenCrossReferences: ["food", "flight", "mobility"],
  },
  finance: {
    vertical: "finance",
    allowedCategories: ["bank", "insurance", "investment", "money_transfer", "crypto_exchange"],
    allowedSubcategories: ["savings", "checking", "loan", "mortgage", "life_insurance", "auto_insurance"],
    allowedCardTemplates: ["GenericCard"],
    allowedMediaKinds: ["building", "reception", "logo", "cover"],
    allowedEventPrefixes: ["finance:"],
    forbiddenCrossReferences: ["food", "beauty", "delivery"],
  },
  delivery: {
    vertical: "delivery",
    allowedCategories: ["food_delivery", "package", "grocery_delivery", "document", "errand"],
    allowedSubcategories: ["standard", "express", "same_day", "scheduled", "fragile"],
    allowedCardTemplates: ["GenericCard"],
    allowedMediaKinds: ["vehicle", "logo"],
    allowedEventPrefixes: ["delivery:", "dispatch:", "tracking:"],
    forbiddenCrossReferences: ["property", "healthcare", "education"],
  },
};

const VERTICAL_ALIASES: Record<string, string> = {
  hotel: "stay",
  service: "services",
  ride: "mobility",
  shops: "retail",
};

export function resolveVerticalKey(vertical: CanonicalVertical): string {
  return VERTICAL_ALIASES[vertical] ?? vertical;
}

export function getVerticalBoundary(vertical: CanonicalVertical): VerticalBoundary | undefined {
  const key = resolveVerticalKey(vertical);
  return VERTICAL_BOUNDARIES[key];
}

export function getAllBoundaries(): VerticalBoundary[] {
  return Object.values(VERTICAL_BOUNDARIES);
}

export interface BoundaryViolation {
  vertical: CanonicalVertical;
  violationType: "invalid_category" | "invalid_subcategory" | "invalid_card" | "invalid_media" | "cross_contamination" | "invalid_event";
  value: string;
  message: string;
}

export function validateCategory(vertical: CanonicalVertical, category: string): BoundaryViolation | null {
  const boundary = getVerticalBoundary(vertical);
  if (!boundary) return null;
  if (!boundary.allowedCategories.includes(category)) {
    return {
      vertical,
      violationType: "invalid_category",
      value: category,
      message: `Category "${category}" is not allowed in vertical "${vertical}". Allowed: ${boundary.allowedCategories.join(", ")}`,
    };
  }
  return null;
}

export function validateSubcategory(vertical: CanonicalVertical, subcategory: string): BoundaryViolation | null {
  const boundary = getVerticalBoundary(vertical);
  if (!boundary) return null;
  if (!boundary.allowedSubcategories.includes(subcategory)) {
    return {
      vertical,
      violationType: "invalid_subcategory",
      value: subcategory,
      message: `Subcategory "${subcategory}" is not allowed in vertical "${vertical}". Allowed: ${boundary.allowedSubcategories.join(", ")}`,
    };
  }
  return null;
}

export function validateCardTemplate(vertical: CanonicalVertical, template: string): BoundaryViolation | null {
  const boundary = getVerticalBoundary(vertical);
  if (!boundary) return null;
  if (!boundary.allowedCardTemplates.includes(template)) {
    return {
      vertical,
      violationType: "invalid_card",
      value: template,
      message: `Card template "${template}" is not allowed in vertical "${vertical}". Allowed: ${boundary.allowedCardTemplates.join(", ")}`,
    };
  }
  return null;
}

export function validateMediaKind(vertical: CanonicalVertical, kind: string): BoundaryViolation | null {
  const boundary = getVerticalBoundary(vertical);
  if (!boundary) return null;
  if (!boundary.allowedMediaKinds.includes(kind)) {
    return {
      vertical,
      violationType: "invalid_media",
      value: kind,
      message: `Media kind "${kind}" is not allowed in vertical "${vertical}". Allowed: ${boundary.allowedMediaKinds.join(", ")}`,
    };
  }
  return null;
}

export function validateCrossReference(sourceVertical: CanonicalVertical, targetVertical: CanonicalVertical): BoundaryViolation | null {
  const resolvedSource = resolveVerticalKey(sourceVertical);
  const resolvedTarget = resolveVerticalKey(targetVertical);
  if (resolvedSource === resolvedTarget) return null;
  const boundary = getVerticalBoundary(sourceVertical);
  if (!boundary) return null;
  const isForbidden = boundary.forbiddenCrossReferences.some(
    (forbidden) => (VERTICAL_ALIASES[forbidden] ?? forbidden) === resolvedTarget || forbidden === resolvedTarget
  );
  if (isForbidden) {
    return {
      vertical: sourceVertical,
      violationType: "cross_contamination",
      value: targetVertical,
      message: `Vertical "${sourceVertical}" cannot reference vertical "${targetVertical}" (resolved: "${resolvedTarget}"). This is a cross-contamination violation.`,
    };
  }
  return null;
}

export function validateEventPrefix(vertical: CanonicalVertical, eventName: string): BoundaryViolation | null {
  const boundary = getVerticalBoundary(vertical);
  if (!boundary) return null;
  const hasValidPrefix = boundary.allowedEventPrefixes.some((prefix) => eventName.startsWith(prefix));
  if (!hasValidPrefix) {
    return {
      vertical,
      violationType: "invalid_event",
      value: eventName,
      message: `Event "${eventName}" does not match any allowed prefix for vertical "${vertical}". Allowed prefixes: ${boundary.allowedEventPrefixes.join(", ")}`,
    };
  }
  return null;
}

export function validateEntityBoundary(entity: {
  vertical: CanonicalVertical;
  category?: string;
  subcategory?: string;
  cardTemplate?: string;
  mediaKinds?: string[];
}): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  if (entity.category) {
    const v = validateCategory(entity.vertical, entity.category);
    if (v) violations.push(v);
  }
  if (entity.subcategory) {
    const v = validateSubcategory(entity.vertical, entity.subcategory);
    if (v) violations.push(v);
  }
  if (entity.cardTemplate) {
    const v = validateCardTemplate(entity.vertical, entity.cardTemplate);
    if (v) violations.push(v);
  }
  if (entity.mediaKinds) {
    for (const kind of entity.mediaKinds) {
      const v = validateMediaKind(entity.vertical, kind);
      if (v) violations.push(v);
    }
  }
  return violations;
}
