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
  booking: "hotel",
  expedia: "hotel",
  govoyage: "hotel",
  property_portal: "property",
  crm_import: "property",
};

const VERTICAL_KEYWORDS: Record<Vertical, string[]> = {
  food: ["restaurant", "café", "cafe", "pizzeria", "sushi", "burger", "shawarma", "grill", "kitchen", "bakery", "diner", "bistro", "cuisine"],
  grocery: ["grocery", "supermarket", "market", "épicerie", "minimarket", "hypermarket", "organic"],
  hotel: ["hotel", "resort", "hostel", "motel", "lodge", "inn", "suites", "apart-hotel", "boutique hotel", "guesthouse"],
  services: ["salon", "spa", "clinic", "barber", "laundry", "cleaning", "repair", "plumber", "electrician", "fitness", "gym"],
  property: ["real estate", "property", "apartment", "villa", "office space", "coworking"],
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

  return { vertical: "services", confidence: 20, reason: "fallback" };
}
