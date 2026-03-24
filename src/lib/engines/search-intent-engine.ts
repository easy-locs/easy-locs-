/**
 * SEARCH INTENT ENGINE
 * Understands user search intent and reshapes discovery.
 * Influences autocomplete, suggestions, result ranking, homepage sections, campaigns.
 */

import { computeGlobalContext } from "@/lib/context/global-context-engine";

export type IntentCategory =
  | "food_specific" | "cuisine_type" | "speed" | "quality"
  | "proximity" | "availability" | "service" | "accommodation"
  | "transport" | "general";

export interface IntentResult {
  query: string;
  primaryIntent: IntentCategory;
  detectedKeywords: string[];
  boostedVerticals: string[];
  boostedSubcategories: string[];
  urgency: "low" | "medium" | "high";
  suggestedFilters: string[];
  contextualSuggestions: string[];
}

// Intent keyword maps
const INTENT_MAP: Record<string, { intent: IntentCategory; verticals: string[]; subs: string[] }> = {
  // Food specific
  pizza: { intent: "food_specific", verticals: ["food"], subs: ["pizza", "italian"] },
  burger: { intent: "food_specific", verticals: ["food"], subs: ["burger", "american", "fast_food"] },
  sushi: { intent: "food_specific", verticals: ["food"], subs: ["sushi", "japanese"] },
  shawarma: { intent: "food_specific", verticals: ["food"], subs: ["shawarma", "arabic", "lebanese"] },
  coffee: { intent: "food_specific", verticals: ["food"], subs: ["coffee", "cafe"] },
  bakery: { intent: "food_specific", verticals: ["food"], subs: ["bakery"] },
  // Cuisine
  italian: { intent: "cuisine_type", verticals: ["food"], subs: ["italian", "pizza", "pasta"] },
  chinese: { intent: "cuisine_type", verticals: ["food"], subs: ["chinese", "asian"] },
  indian: { intent: "cuisine_type", verticals: ["food"], subs: ["indian"] },
  lebanese: { intent: "cuisine_type", verticals: ["food"], subs: ["lebanese", "arabic"] },
  thai: { intent: "cuisine_type", verticals: ["food"], subs: ["thai", "asian"] },
  // Speed/quality
  fast: { intent: "speed", verticals: ["food"], subs: ["fast_food", "delivery"] },
  quick: { intent: "speed", verticals: ["food"], subs: ["fast_food", "delivery"] },
  premium: { intent: "quality", verticals: ["food", "services"], subs: ["premium", "fine_dining", "luxury"] },
  luxury: { intent: "quality", verticals: ["food", "property", "services"], subs: ["luxury", "premium"] },
  cheap: { intent: "quality", verticals: ["food"], subs: ["fast_food", "budget"] },
  // Proximity/availability
  nearby: { intent: "proximity", verticals: ["food", "services", "grocery"], subs: [] },
  "near me": { intent: "proximity", verticals: ["food", "services"], subs: [] },
  "open now": { intent: "availability", verticals: ["food", "services", "grocery"], subs: [] },
  "24h": { intent: "availability", verticals: ["food", "grocery"], subs: [] },
  // Service
  plumber: { intent: "service", verticals: ["services"], subs: ["plumbing", "repair"] },
  cleaning: { intent: "service", verticals: ["services"], subs: ["cleaning"] },
  spa: { intent: "service", verticals: ["services"], subs: ["spa", "beauty", "wellness"] },
  // Accommodation
  hotel: { intent: "accommodation", verticals: ["property"], subs: ["hotel", "resort"] },
  villa: { intent: "accommodation", verticals: ["property"], subs: ["villa", "rental"] },
  apartment: { intent: "accommodation", verticals: ["property"], subs: ["apartment", "rental"] },
};

export function analyzeSearchIntent(query: string): IntentResult {
  const q = query.toLowerCase().trim();
  const ctx = computeGlobalContext();
  const detected: string[] = [];
  let primaryIntent: IntentCategory = "general";
  const verticals = new Set<string>();
  const subs = new Set<string>();

  // Match keywords
  for (const [keyword, mapping] of Object.entries(INTENT_MAP)) {
    if (q.includes(keyword)) {
      detected.push(keyword);
      primaryIntent = mapping.intent;
      mapping.verticals.forEach(v => verticals.add(v));
      mapping.subs.forEach(s => subs.add(s));
    }
  }

  // Urgency from time
  const urgency: IntentResult["urgency"] =
    ctx.timeSlot === "late_night" ? "high" :
    ctx.timeSlot === "lunch" ? "medium" : "low";

  // Contextual suggestions from time + intent
  const contextualSuggestions: string[] = [];
  if (ctx.timeSlot === "lunch" && primaryIntent === "general") {
    contextualSuggestions.push("lunch deals", "quick lunch", "healthy bowl");
  }
  if (ctx.timeSlot === "dinner") {
    contextualSuggestions.push("dinner near me", "popular tonight", "family dinner");
  }
  if (ctx.timeSlot === "late_night") {
    contextualSuggestions.push("open now", "fast delivery", "24h");
  }

  // Suggested filters
  const suggestedFilters: string[] = [];
  if (primaryIntent === "proximity") suggestedFilters.push("sort_by_distance");
  if (primaryIntent === "speed") suggestedFilters.push("sort_by_delivery_time");
  if (primaryIntent === "quality") suggestedFilters.push("sort_by_rating");
  if (primaryIntent === "availability") suggestedFilters.push("open_now");

  return {
    query: q,
    primaryIntent,
    detectedKeywords: detected,
    boostedVerticals: [...verticals],
    boostedSubcategories: [...subs],
    urgency,
    suggestedFilters,
    contextualSuggestions,
  };
}

/** Get trending search terms for current context */
export function getTrendingSearches(): string[] {
  const ctx = computeGlobalContext();
  const base = [
    ...(ctx.recommendedSegments.slice(0, 4)),
    "near me", "open now",
  ];
  if (ctx.activeEvents.length > 0) {
    base.unshift(`${ctx.activeEvents[0].emoji} ${ctx.activeEvents[0].name}`);
  }
  return base.slice(0, 8);
}
