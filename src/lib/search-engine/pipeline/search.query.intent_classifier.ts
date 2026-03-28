/**
 * search.query.intent_classifier — Classifies user search intent.
 * Pure function. No DB, no side effects.
 *
 * Intent types:
 * - "browse"    → no specific query, user is exploring
 * - "lookup"    → user wants a specific shop/product by name
 * - "category"  → user typed a category/vertical term
 * - "location"  → user typed a location-oriented query
 * - "mixed"     → query contains both category + location signals
 */

export type SearchIntent = "browse" | "lookup" | "category" | "location" | "mixed";

export interface IntentClassification {
  intent: SearchIntent;
  confidence: number; // 0–1
  signals: string[];
}

const LOCATION_MARKERS = [
  "near", "in", "at", "around", "close to", "nearby", "à", "au", "dans",
  "quartier", "zone", "district", "centre", "center",
];

const CATEGORY_MARKERS = [
  "restaurant", "café", "cafe", "hotel", "shop", "store", "market",
  "pharmacy", "salon", "gym", "bar", "boutique", "supermarket",
  "bakery", "clinic", "spa", "garage", "school",
];

export function classifyIntent(query: string): IntentClassification {
  const q = query.trim().toLowerCase();

  if (!q) return { intent: "browse", confidence: 1, signals: ["empty_query"] };

  const signals: string[] = [];
  let locationScore = 0;
  let categoryScore = 0;

  for (const marker of LOCATION_MARKERS) {
    if (q.includes(marker)) {
      locationScore++;
      signals.push(`loc:${marker}`);
    }
  }

  for (const marker of CATEGORY_MARKERS) {
    if (q.includes(marker)) {
      categoryScore++;
      signals.push(`cat:${marker}`);
    }
  }

  if (locationScore > 0 && categoryScore > 0) {
    return { intent: "mixed", confidence: 0.8, signals };
  }
  if (locationScore > 0) {
    return { intent: "location", confidence: 0.7 + Math.min(locationScore * 0.1, 0.3), signals };
  }
  if (categoryScore > 0) {
    return { intent: "category", confidence: 0.7 + Math.min(categoryScore * 0.1, 0.3), signals };
  }

  // Default: treat as a name lookup
  return { intent: "lookup", confidence: 0.5, signals: ["no_markers"] };
}
