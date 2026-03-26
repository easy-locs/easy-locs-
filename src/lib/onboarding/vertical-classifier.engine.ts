/**
 * Vertical Classifier Engine — Determines the canonical vertical for an entity
 * based on source signals, category hints, and business name analysis.
 */
import type { OnboardingVertical } from "./source-policy.engine";

export interface VerticalClassificationInput {
  businessName: string;
  sourceCategory?: string | null;
  sourceType?: string | null;
  tags?: string[];
  url?: string | null;
}

export interface VerticalClassificationResult {
  vertical: OnboardingVertical;
  confidence: number; // 0-100
  reason: string;
}

const VERTICAL_KEYWORDS: Record<OnboardingVertical, string[]> = {
  food: ["restaurant", "café", "cafe", "pizzeria", "sushi", "burger", "shawarma", "grill", "kitchen", "bakery", "patisserie", "diner", "bistro", "brasserie", "food", "eat", "meal", "cuisine"],
  grocery: ["grocery", "supermarket", "market", "épicerie", "minimarket", "hypermarket", "fresh", "organic"],
  hotel: ["hotel", "resort", "hostel", "motel", "lodge", "inn", "suites", "apart-hotel", "boutique hotel", "riad", "b&b", "guesthouse"],
  services: ["salon", "spa", "clinic", "dentist", "barber", "laundry", "cleaning", "repair", "garage", "plumber", "electrician", "consultant", "agency", "studio", "fitness", "gym"],
  property: ["real estate", "immobilier", "property", "apartment", "villa", "office space", "coworking", "warehouse"],
};

const SOURCE_VERTICAL_MAP: Record<string, OnboardingVertical> = {
  deliveroo: "food",
  talabat: "food",
  careem: "food",
  noon: "grocery",
  booking: "hotel",
  expedia: "hotel",
  govoyage: "hotel",
  property_portal: "property",
  crm_import: "property",
};

export function classifyVertical(input: VerticalClassificationInput): VerticalClassificationResult {
  const name = (input.businessName || "").toLowerCase();
  const cat = (input.sourceCategory || "").toLowerCase();
  const combined = `${name} ${cat} ${(input.tags || []).join(" ")}`.toLowerCase();

  // 1. Source-based classification (highest confidence)
  if (input.sourceType && SOURCE_VERTICAL_MAP[input.sourceType]) {
    return {
      vertical: SOURCE_VERTICAL_MAP[input.sourceType],
      confidence: 90,
      reason: `source_type=${input.sourceType}`,
    };
  }

  // 2. Keyword matching
  let bestMatch: OnboardingVertical = "services";
  let bestScore = 0;

  for (const [vertical, keywords] of Object.entries(VERTICAL_KEYWORDS)) {
    const score = keywords.filter((kw) => combined.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = vertical as OnboardingVertical;
    }
  }

  if (bestScore > 0) {
    return {
      vertical: bestMatch,
      confidence: Math.min(40 + bestScore * 15, 85),
      reason: `keyword_match(${bestScore} hits)`,
    };
  }

  // 3. Fallback
  return { vertical: "services", confidence: 20, reason: "fallback_default" };
}
