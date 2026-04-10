/**
 * Living Commerce Engine — Dynamic section composer for living pages.
 * Produces intelligent, context-aware section lists that make every page feel alive.
 * Consumes: Global Context Engine, Ranking Engine, Boost Engine.
 */

import { computeGlobalContext, type GlobalContext } from "@/lib/context/global-context-engine";

// ── Section Types ──

export type SectionType =
  | "trending" | "new_near_you" | "just_added" | "best_rated"
  | "popular_tonight" | "fast_delivery" | "hidden_gems" | "premium_picks"
  | "family_meals" | "contextual_event" | "weekend_vibes" | "late_night_cravings"
  | "breakfast_picks" | "lunch_combos" | "afternoon_treats" | "recommended_for_you";

export interface LivingSection {
  id: string;
  type: SectionType;
  title: string;
  emoji: string;
  priority: number;
  /** Subcategories to filter/boost for this section */
  targetSubs: string[];
  /** Whether this section should auto-hide if empty */
  hideIfEmpty: boolean;
  /** Contextual gradient for visual accent */
  gradient?: string;
}

export interface LivingPageOutput {
  activeSections: LivingSection[];
  highlightedCategories: string[];
  highlightedSubcategories: string[];
  contextualTheme: string;
  freshnessLevel: "fresh" | "warm" | "stale";
}

// ── Section Factory ──

function buildTimeBasedSections(ctx: GlobalContext): LivingSection[] {
  const sections: LivingSection[] = [];

  switch (ctx.timeSlot) {
    case "early_morning":
    case "morning":
      sections.push({
        id: "breakfast", type: "breakfast_picks",
        title: "Breakfast & Coffee", emoji: "☀️", priority: 85,
        targetSubs: ["coffee", "bakery", "breakfast", "cafe", "healthy", "brunch"],
        hideIfEmpty: true,
      });
      break;
    case "lunch":
      sections.push({
        id: "lunch", type: "lunch_combos",
        title: "Lunch Deals", emoji: "🍽️", priority: 85,
        targetSubs: ["fast_food", "restaurant", "combo", "healthy", "shawarma", "wraps"],
        hideIfEmpty: true,
      });
      break;
    case "afternoon":
      sections.push({
        id: "afternoon", type: "afternoon_treats",
        title: "Afternoon Treats", emoji: "🍵", priority: 75,
        targetSubs: ["cafe", "desserts", "bakery", "snacks", "beverages"],
        hideIfEmpty: true,
      });
      break;
    case "dinner":
      sections.push({
        id: "dinner", type: "popular_tonight",
        title: "Popular Tonight", emoji: "🌙", priority: 90,
        targetSubs: ["restaurant", "dineout", "pizza", "sushi", "seafood", "premium"],
        hideIfEmpty: true,
      });
      break;
    case "late_night":
      sections.push({
        id: "late-night", type: "late_night_cravings",
        title: "Late Night Cravings", emoji: "🌃", priority: 88,
        targetSubs: ["fast_food", "pizza", "burgers", "shawarma", "delivery"],
        hideIfEmpty: true,
      });
      break;
  }

  return sections;
}

function buildEventSections(ctx: GlobalContext): LivingSection[] {
  return ctx.activeEvents.map(evt => ({
    id: `event-${evt.id}`,
    type: "contextual_event" as SectionType,
    title: `${evt.emoji} ${evt.name} Specials`,
    emoji: evt.emoji,
    priority: 95,
    targetSubs: evt.boostedSubs,
    hideIfEmpty: true,
    gradient: evt.accentGradient,
  }));
}

function buildWeekendSections(ctx: GlobalContext): LivingSection[] {
  if (!ctx.isWeekend) return [];
  return [{
    id: "weekend", type: "weekend_vibes",
    title: "Weekend Vibes", emoji: "🎉", priority: 70,
    targetSubs: ["dineout", "premium", "desserts", "cafe", "family_meals", "brunch"],
    hideIfEmpty: true,
  }];
}

// ── Always-on sections ──

const EVERGREEN_SECTIONS: LivingSection[] = [
  {
    id: "trending", type: "trending",
    title: "Trending Now", emoji: "🔥", priority: 80,
    targetSubs: [], hideIfEmpty: true,
  },
  {
    id: "best-rated", type: "best_rated",
    title: "Best Rated", emoji: "⭐", priority: 72,
    targetSubs: [], hideIfEmpty: true,
  },
  {
    id: "new", type: "just_added",
    title: "Just Added", emoji: "✨", priority: 68,
    targetSubs: [], hideIfEmpty: true,
  },
  {
    id: "near", type: "new_near_you",
    title: "Near You", emoji: "📍", priority: 65,
    targetSubs: [], hideIfEmpty: true,
  },
  {
    id: "fast", type: "fast_delivery",
    title: "Fast Delivery", emoji: "⚡", priority: 60,
    targetSubs: ["delivery", "fast_food", "ready_to_eat"], hideIfEmpty: true,
  },
  {
    id: "premium", type: "premium_picks",
    title: "Premium Picks", emoji: "💎", priority: 55,
    targetSubs: ["premium", "dineout", "fine_dining", "luxury"], hideIfEmpty: true,
  },
  {
    id: "hidden", type: "hidden_gems",
    title: "Hidden Gems", emoji: "🔮", priority: 50,
    targetSubs: [], hideIfEmpty: true,
  },
];

// ── Main Composer ──

export function composeLivingPage(input?: { country?: string; city?: string; maxSections?: number }): LivingPageOutput {
  const ctx = computeGlobalContext({ country: input?.country, city: input?.city });
  const max = input?.maxSections || 8;

  // Gather all candidate sections
  const candidates: LivingSection[] = [
    ...buildEventSections(ctx),
    ...buildTimeBasedSections(ctx),
    ...buildWeekendSections(ctx),
    ...EVERGREEN_SECTIONS,
  ];

  // Sort by priority, dedupe by id, limit
  const seen = new Set<string>();
  const activeSections = candidates
    .sort((a, b) => b.priority - a.priority)
    .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .slice(0, max);

  // Compute highlighted categories from context
  const highlightedCategories = ctx.recommendedSegments.slice(0, 6);
  const highlightedSubcategories = ctx.recommendedSegments.slice(0, 10);

  // Freshness based on how much dynamic content is available
  const eventCount = ctx.activeEvents.length;
  const freshnessLevel: LivingPageOutput["freshnessLevel"] =
    eventCount > 0 ? "fresh" : ctx.isWeekend ? "warm" : "stale";

  return {
    activeSections,
    highlightedCategories,
    highlightedSubcategories,
    contextualTheme: ctx.visualTheme,
    freshnessLevel,
  };
}

/** Get the top contextual section for a specific surface (shop, search, etc.) */
export function getContextualSection(surface: string, ctx?: GlobalContext): LivingSection | null {
  const c = ctx || computeGlobalContext();
  const eventSections = buildEventSections(c);
  if (eventSections.length > 0) return eventSections[0];
  const timeSections = buildTimeBasedSections(c);
  if (timeSections.length > 0) return timeSections[0];
  return null;
}
