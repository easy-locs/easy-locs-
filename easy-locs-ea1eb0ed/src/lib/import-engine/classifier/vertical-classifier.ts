/**
 * Vertical Classifier — Determines canonical vertical from source signals.
 */
import type { Vertical, SourceName } from "../types";

export interface ClassificationInput {
  businessName: string;
  sourceCategory?: string | null;
  sourceType?: string | null;
  tags?: string[];
  url?: string | null;
}

export interface ClassificationResult {
  vertical: Vertical;
  confidence: number; // 0-100
  reason: string;
}

const SOURCE_VERTICAL: Record<string, Vertical> = {
  deliveroo: "food",
  talabat: "food",
  careem: "food",
  noon: "grocery",
  booking: "stay",
  expedia: "stay",
  govoyage: "stay",
  airbnb: "stay",
  property_portal: "property",
  crm_import: "property",
  bayut: "property",
  dubizzle: "property",
  uber: "mobility",
  bolt: "mobility",
  amazon: "shops",
  namshi: "shops",
};

const VERTICAL_KEYWORDS: Record<string, string[]> = {
  food: ["restaurant", "café", "cafe", "pizzeria", "sushi", "burger", "shawarma", "grill", "kitchen", "bakery", "diner", "bistro", "cuisine", "steakhouse", "seafood", "buffet", "brunch"],
  grocery: ["grocery", "supermarket", "market", "épicerie", "minimarket", "hypermarket", "organic", "fresh produce", "wholesale"],
  stay: ["hotel", "resort", "hostel", "motel", "lodge", "inn", "suites", "apart-hotel", "boutique hotel", "guesthouse", "vacation rental", "holiday home"],
  services: ["salon", "spa", "clinic", "barber", "laundry", "cleaning", "repair", "plumber", "electrician", "fitness", "gym", "handyman", "pest control", "tutor", "moving", "car wash", "detailing"],
  property: ["real estate", "property", "apartment", "villa", "office space", "coworking", "penthouse", "townhouse", "warehouse", "land", "developer"],
  shops: ["retail", "fashion", "clothing", "electronics", "jewelry", "perfume", "cosmetics", "furniture", "home decor", "toys", "sportswear", "boutique", "mall", "store"],
  mobility: ["taxi", "ride", "chauffeur", "car rental", "driver", "limousine", "transport", "courier", "delivery fleet"],
  utility: ["atm", "fuel", "gas station", "parking", "ev charging", "post office", "fire station", "police station"],
  healthcare: ["pharmacy", "hospital", "dental", "doctor", "medical", "health center", "optician"],
  experiences: ["cinema", "theater", "museum", "tour", "activity", "event", "adventure", "theme park", "waterpark"],
};

export function classifyVertical(input: ClassificationInput): ClassificationResult {
  // 1. Source-based (highest confidence)
  if (input.sourceType && SOURCE_VERTICAL[input.sourceType]) {
    return { vertical: SOURCE_VERTICAL[input.sourceType], confidence: 90, reason: `source=${input.sourceType}` };
  }

  // 2. Keyword matching
  const combined = `${input.businessName} ${input.sourceCategory ?? ""} ${(input.tags ?? []).join(" ")}`.toLowerCase();
  let best: Vertical = "services";
  let bestScore = 0;

  for (const [v, kws] of Object.entries(VERTICAL_KEYWORDS)) {
    const hits = kws.filter(kw => combined.includes(kw)).length;
    if (hits > bestScore) {
      bestScore = hits;
      best = v as Vertical;
    }
  }

  if (bestScore > 0) {
    return { vertical: best, confidence: Math.min(40 + bestScore * 15, 85), reason: `keywords(${bestScore})` };
  }

  return { vertical: "services" as Vertical, confidence: 20, reason: "fallback" };
}
