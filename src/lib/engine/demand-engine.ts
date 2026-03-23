/**
 * DEMAND ENGINE — Time + Geo + Trend-based demand signals.
 * =========================================================
 * Computes demand scores based on:
 *   - time of day (breakfast, lunch, dinner, late night)
 *   - day of week (weekday vs weekend patterns)
 *   - country/city trends
 *   - seasonal patterns
 *
 * Layer: System Capabilities.
 * Consumes: Business Taxonomy (vertical/subcategory) for scoring.
 * Does NOT mix with: Action Model, Wallet, QR.
 */

import { getTimeContext, type TimeContext } from "@/lib/discovery/timeContext";

// ═══════════════════════════════════════════════════════════
//  DEMAND CONTEXT
// ═══════════════════════════════════════════════════════════

export interface DemandContext {
  time: TimeContext;
  dayOfWeek: number;  // 0=Sun, 6=Sat
  isWeekend: boolean;
  city?: string;
  countryCode?: string;
  season: Season;
}

export type Season = "winter" | "spring" | "summer" | "autumn";

function getSeason(month: number, isNorthern: boolean): Season {
  if (isNorthern) {
    if (month <= 2 || month === 12) return "winter";
    if (month <= 5) return "spring";
    if (month <= 8) return "summer";
    return "autumn";
  }
  // Southern hemisphere (flip)
  if (month <= 2 || month === 12) return "summer";
  if (month <= 5) return "autumn";
  if (month <= 8) return "winter";
  return "spring";
}

export function getDemandContext(countryCode?: string): DemandContext {
  const now = new Date();
  const dow = now.getDay();
  const month = now.getMonth() + 1;
  // Most platform countries are northern hemisphere; UAE has no real winter
  const isNorthern = !["AU", "NZ", "ZA", "AR", "BR", "CL"].includes(countryCode ?? "");

  return {
    time: getTimeContext(),
    dayOfWeek: dow,
    isWeekend: dow === 0 || dow === 5 || dow === 6, // Fri-Sat-Sun for GCC
    countryCode,
    season: getSeason(month, isNorthern),
  };
}

// ═══════════════════════════════════════════════════════════
//  DEMAND SCORING
// ═══════════════════════════════════════════════════════════

/** Category demand multipliers by time period. */
const TIME_DEMAND: Record<string, Record<string, number>> = {
  breakfast: { cafe: 1.5, bakery: 1.8, breakfast: 2.0, grocery: 1.2, healthy: 1.3 },
  lunch: { restaurant: 1.5, pizza: 1.4, burger: 1.4, sushi: 1.3, indian: 1.3, lebanese: 1.3, chinese: 1.3, shawarma: 1.5 },
  snack: { cafe: 1.4, desserts: 1.6, bakery: 1.3, juice: 1.4, ice_cream: 1.5 },
  dinner: { restaurant: 1.5, italian: 1.4, japanese: 1.4, seafood: 1.5, steakhouse: 1.5, lebanese: 1.3, fine_dining: 1.6 },
  late_night: { fast_food: 1.8, fried_chicken: 1.5, burger: 1.4, shawarma: 1.6, desserts: 1.3, pharmacy: 1.4 },
};

/** Weekend demand boosts. */
const WEEKEND_DEMAND: Record<string, number> = {
  activities: 1.8,
  entertainment: 1.7,
  spa: 1.5,
  salon: 1.3,
  brunch: 2.0,
  shopping: 1.4,
  fashion: 1.3,
  car_rental: 1.4,
  experiences: 1.6,
};

/** Seasonal demand (GCC-specific). */
const SEASONAL_DEMAND: Record<Season, Record<string, number>> = {
  summer: { ice_cream: 1.8, pool: 2.0, ac_repair: 1.9, car_wash: 1.3, indoor: 1.5 },
  winter: { activities: 1.6, outdoor: 1.8, cafe: 1.3, brunch: 1.4, desert_safari: 1.5 },
  spring: { flowers: 1.4, outdoor: 1.3, activities: 1.3 },
  autumn: { cafe: 1.2, shopping: 1.2 },
};

/**
 * Compute demand score for an entity based on current context.
 * Returns 0–1 (0 = no special demand, 1 = peak demand).
 */
export function computeDemandScore(
  subcategory: string | null | undefined,
  vertical: string | null | undefined,
  ctx?: DemandContext
): number {
  if (!subcategory && !vertical) return 0.3; // neutral

  const context = ctx ?? getDemandContext();
  const sub = subcategory ?? "";
  let score = 0.3; // baseline

  // Time-based demand
  const timeDemand = TIME_DEMAND[context.time.period];
  if (timeDemand?.[sub]) {
    score = Math.max(score, timeDemand[sub] / 2); // normalize to 0-1
  }

  // Weekend boost
  if (context.isWeekend && WEEKEND_DEMAND[sub]) {
    score = Math.min(1, score * WEEKEND_DEMAND[sub]);
  }

  // Seasonal boost
  const seasonDemand = SEASONAL_DEMAND[context.season];
  if (seasonDemand?.[sub]) {
    score = Math.min(1, score * seasonDemand[sub]);
  }

  return Math.min(1, score);
}

/**
 * Get trending subcategories for the current demand context.
 */
export function getTrendingSubcategories(ctx?: DemandContext): string[] {
  const context = ctx ?? getDemandContext();
  const timeDemand = TIME_DEMAND[context.time.period] ?? {};

  // Merge time + weekend + season trends, sort by score
  const scores: Record<string, number> = {};
  for (const [sub, val] of Object.entries(timeDemand)) {
    scores[sub] = (scores[sub] ?? 0) + val;
  }
  if (context.isWeekend) {
    for (const [sub, val] of Object.entries(WEEKEND_DEMAND)) {
      scores[sub] = (scores[sub] ?? 0) + val;
    }
  }
  const seasonDemand = SEASONAL_DEMAND[context.season];
  if (seasonDemand) {
    for (const [sub, val] of Object.entries(seasonDemand)) {
      scores[sub] = (scores[sub] ?? 0) + val;
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sub]) => sub);
}
