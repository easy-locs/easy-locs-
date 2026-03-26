/**
 * Taxonomy Mapper Engine — Maps raw source categories to canonical platform taxonomy.
 * Bridges external category labels (Deliveroo, Booking, etc.) to internal verticals/clusters.
 */
import type { OnboardingVertical } from "./source-policy.engine";

export interface TaxonomyMapping {
  canonical_vertical: OnboardingVertical;
  canonical_cluster?: string;
  canonical_subcategory?: string;
  confidence: number;
  source_label: string;
}

/** Common mappings from external platforms to canonical taxonomy */
const CATEGORY_MAP: Record<string, { vertical: OnboardingVertical; cluster?: string; sub?: string }> = {
  // Food
  "restaurant": { vertical: "food", cluster: "restaurants" },
  "fast food": { vertical: "food", cluster: "restaurants", sub: "fast_food" },
  "café": { vertical: "food", cluster: "cafes_bakeries", sub: "cafe" },
  "cafe": { vertical: "food", cluster: "cafes_bakeries", sub: "cafe" },
  "bakery": { vertical: "food", cluster: "cafes_bakeries", sub: "bakery" },
  "pizza": { vertical: "food", cluster: "restaurants", sub: "pizza" },
  "sushi": { vertical: "food", cluster: "restaurants", sub: "japanese" },
  "burger": { vertical: "food", cluster: "restaurants", sub: "burgers" },
  "shawarma": { vertical: "food", cluster: "restaurants", sub: "middle_eastern" },
  "indian": { vertical: "food", cluster: "restaurants", sub: "indian" },
  "chinese": { vertical: "food", cluster: "restaurants", sub: "chinese" },
  "italian": { vertical: "food", cluster: "restaurants", sub: "italian" },
  "desserts": { vertical: "food", cluster: "cafes_bakeries", sub: "desserts" },
  "juice": { vertical: "food", cluster: "cafes_bakeries", sub: "juice_smoothies" },

  // Grocery
  "supermarket": { vertical: "grocery", cluster: "supermarkets" },
  "grocery": { vertical: "grocery", cluster: "supermarkets" },
  "convenience store": { vertical: "grocery", cluster: "convenience" },
  "organic": { vertical: "grocery", cluster: "specialty", sub: "organic" },

  // Hotel
  "hotel": { vertical: "hotel", cluster: "hotels" },
  "resort": { vertical: "hotel", cluster: "resorts" },
  "hostel": { vertical: "hotel", cluster: "hostels" },
  "apartment hotel": { vertical: "hotel", cluster: "serviced_apartments" },
  "bed and breakfast": { vertical: "hotel", cluster: "bnb" },
  "guesthouse": { vertical: "hotel", cluster: "guesthouses" },

  // Services
  "salon": { vertical: "services", cluster: "beauty", sub: "hair_salon" },
  "spa": { vertical: "services", cluster: "beauty", sub: "spa" },
  "barber": { vertical: "services", cluster: "beauty", sub: "barber" },
  "gym": { vertical: "services", cluster: "fitness", sub: "gym" },
  "clinic": { vertical: "services", cluster: "health", sub: "clinic" },
  "laundry": { vertical: "services", cluster: "home_services", sub: "laundry" },
  "cleaning": { vertical: "services", cluster: "home_services", sub: "cleaning" },

  // Property
  "apartment": { vertical: "property", cluster: "residential", sub: "apartment" },
  "villa": { vertical: "property", cluster: "residential", sub: "villa" },
  "office": { vertical: "property", cluster: "commercial", sub: "office" },
  "warehouse": { vertical: "property", cluster: "commercial", sub: "warehouse" },
};

export function mapToCanonicalTaxonomy(
  sourceCategory: string,
  sourceSubcategory?: string | null
): TaxonomyMapping {
  const key = (sourceCategory || "").toLowerCase().trim();
  const subKey = (sourceSubcategory || "").toLowerCase().trim();

  // Try exact match
  const exact = CATEGORY_MAP[key] || CATEGORY_MAP[subKey];
  if (exact) {
    return {
      canonical_vertical: exact.vertical,
      canonical_cluster: exact.cluster,
      canonical_subcategory: exact.sub,
      confidence: 90,
      source_label: key,
    };
  }

  // Try partial match
  for (const [mapKey, mapping] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return {
        canonical_vertical: mapping.vertical,
        canonical_cluster: mapping.cluster,
        canonical_subcategory: mapping.sub,
        confidence: 70,
        source_label: key,
      };
    }
  }

  // Fallback
  return {
    canonical_vertical: "services",
    confidence: 20,
    source_label: key,
  };
}
