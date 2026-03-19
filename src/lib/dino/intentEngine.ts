/**
 * DINO V7 — User Intent Engine
 * Understands what users want based on context, time, behavior.
 */

export interface IntentContext {
  currentRoute: string;
  timeOfDay: number;           // 0-23
  dayOfWeek: number;           // 0=Sun, 6=Sat
  recentRoutes: string[];
  recentSearches: string[];
  favoriteCategories: string[];
  lastOrderCategory?: string;
  country: string;
  city?: string;
}

export interface IntentSuggestion {
  type: "category" | "action" | "content" | "shortcut";
  label: string;
  route: string;
  confidence: number;  // 0-1
  reason: string;
}

const TIME_CONTEXTS: Record<string, { hours: number[]; categories: string[] }> = {
  breakfast: { hours: [6, 7, 8, 9, 10], categories: ["coffee", "breakfast", "bakery"] },
  lunch: { hours: [11, 12, 13, 14], categories: ["restaurant", "fast_food", "delivery"] },
  afternoon: { hours: [14, 15, 16, 17], categories: ["coffee", "services", "shopping"] },
  dinner: { hours: [18, 19, 20, 21], categories: ["restaurant", "delivery", "food"] },
  night: { hours: [21, 22, 23, 0, 1, 2], categories: ["delivery", "transport", "ride"] },
};

const WEEKEND_BOOST = ["travel", "leisure", "property", "shopping", "services"];

export function inferUserIntent(ctx: IntentContext): IntentSuggestion[] {
  const suggestions: IntentSuggestion[] = [];
  const isWeekend = ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6;

  // Time-based suggestions
  for (const [, config] of Object.entries(TIME_CONTEXTS)) {
    if (config.hours.includes(ctx.timeOfDay)) {
      for (const cat of config.categories) {
        suggestions.push({
          type: "category",
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          route: `/food?category=${cat}`,
          confidence: 0.6,
          reason: `Popular at this time of day`,
        });
      }
      break;
    }
  }

  // Weekend boost
  if (isWeekend) {
    for (const cat of WEEKEND_BOOST) {
      suggestions.push({
        type: "category",
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        route: `/${cat}`,
        confidence: 0.5,
        reason: "Weekend activity",
      });
    }
  }

  // Repeat order shortcut
  if (ctx.lastOrderCategory) {
    suggestions.push({
      type: "shortcut",
      label: `Reorder ${ctx.lastOrderCategory}`,
      route: `/food?reorder=${ctx.lastOrderCategory}`,
      confidence: 0.8,
      reason: "Based on your last order",
    });
  }

  // Favorite categories
  for (const fav of ctx.favoriteCategories.slice(0, 3)) {
    suggestions.push({
      type: "category",
      label: fav,
      route: `/search?category=${fav}`,
      confidence: 0.7,
      reason: "Frequently used",
    });
  }

  // Recent search continuity
  if (ctx.recentSearches.length > 0) {
    const lastSearch = ctx.recentSearches[0];
    suggestions.push({
      type: "action",
      label: `Continue: "${lastSearch}"`,
      route: `/search?q=${encodeURIComponent(lastSearch)}`,
      confidence: 0.65,
      reason: "Continue your recent search",
    });
  }

  // Deduplicate and sort by confidence
  const seen = new Set<string>();
  return suggestions
    .filter(s => { if (seen.has(s.route)) return false; seen.add(s.route); return true; })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}
