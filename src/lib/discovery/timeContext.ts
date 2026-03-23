/**
 * timeContext — Intelligent time-based discovery ranking.
 * Returns the current meal/time period and boosts relevant food subcategories.
 * Timezone-aware via browser's Intl API.
 */

export type TimePeriod = "breakfast" | "lunch" | "snack" | "dinner" | "lateNight";

export interface TimeContext {
  period: TimePeriod;
  hour: number;
  label: string;
  emoji: string;
  /** Subcategory values boosted for this time period */
  boostedSubs: string[];
}

const PERIOD_CONFIG: Record<TimePeriod, { label: string; emoji: string; boostedSubs: string[] }> = {
  breakfast: {
    label: "Breakfast",
    emoji: "🌅",
    boostedSubs: ["bakery", "cafe", "french", "healthy", "dairy", "eggs", "bakery_grocery"],
  },
  lunch: {
    label: "Lunch",
    emoji: "☀️",
    boostedSubs: ["fast_food", "lebanese", "indian", "chinese", "arabic", "asian", "healthy", "restaurant", "shawarma", "wraps", "pasta"],
  },
  snack: {
    label: "Snack Time",
    emoji: "🍵",
    boostedSubs: ["cafe", "bakery", "healthy", "desserts", "snacks", "beverages"],
  },
  dinner: {
    label: "Dinner",
    emoji: "🌙",
    boostedSubs: ["italian", "japanese", "seafood", "turkish", "dineout", "restaurant", "indian", "lebanese", "pasta", "sushi"],
  },
  lateNight: {
    label: "Late Night",
    emoji: "🌃",
    boostedSubs: ["fast_food", "american", "ready_to_eat", "burger", "shawarma", "pizza"],
  },
};

export function getTimePeriod(hour?: number): TimePeriod {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 15 && h < 18) return "snack";
  if (h >= 18 && h < 23) return "dinner";
  return "lateNight";
}

export function getTimeContext(): TimeContext {
  const hour = new Date().getHours();
  const period = getTimePeriod(hour);
  const config = PERIOD_CONFIG[period];
  return { period, hour, ...config };
}

/**
 * Score a subcategory by time relevance (0 = no boost, 1 = max boost).
 */
export function timeRelevanceScore(subcategory: string | null | undefined, ctx?: TimeContext): number {
  if (!subcategory) return 0;
  const tc = ctx ?? getTimeContext();
  return tc.boostedSubs.includes(subcategory) ? 1 : 0;
}
