/**
 * DIGITAL ORCHESTRATION ENGINE
 * Top-level decision layer — decides what the app pushes every day, hour, context.
 * Reads all context signals, controls homepage ordering, banners, trending, radar, search.
 */

import { computeGlobalContext, type GlobalContext } from "@/lib/context/global-context-engine";
import { composeLivingPage } from "@/lib/commerce/living-commerce-engine";
import { getTopBanners } from "@/lib/context-banner/context-banner-engine";
import { resolveActiveEvents } from "@/lib/experience/global-event-registry";

export interface DigitalOrchestrationOutput {
  context: GlobalContext;
  homepageSections: string[];
  activeBanners: { id: string; title: string; priority: number }[];
  trendingCategories: string[];
  nearYouPriority: number;
  openNowPriority: number;
  searchSuggestions: string[];
  promotedVerticals: string[];
  eventOverrides: { eventId: string; name: string; emoji: string }[];
  computedAt: string;
}

// Time-aware search suggestions
const SEARCH_SUGGESTIONS: Record<string, string[]> = {
  early_morning: ["coffee near me", "breakfast", "bakery", "healthy bowl"],
  morning: ["brunch", "cafe", "croissant", "juice"],
  lunch: ["lunch deals", "burger", "shawarma", "healthy lunch", "sushi"],
  afternoon: ["coffee", "dessert", "cake", "bubble tea", "snacks"],
  dinner: ["pizza", "sushi", "restaurant", "family dinner", "steak"],
  late_night: ["open now", "fast delivery", "pizza", "burger", "shawarma"],
};

// Vertical priority by time
const VERTICAL_PRIORITY: Record<string, string[]> = {
  early_morning: ["food", "grocery"],
  morning: ["food", "services", "grocery"],
  lunch: ["food", "grocery", "services"],
  afternoon: ["food", "services", "shops"],
  dinner: ["food", "experiences", "property"],
  late_night: ["food", "mobility"],
};

export function runDigitalOrchestration(input?: {
  country?: string;
  city?: string;
}): DigitalOrchestrationOutput {
  const ctx = computeGlobalContext({ country: input?.country, city: input?.city });
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Living page sections
  const living = composeLivingPage({ country: ctx.country, city: ctx.city, maxSections: 10 });
  const homepageSections = living.activeSections.map(s => s.title);

  // Banners
  const banners = getTopBanners({ country: ctx.country, city: ctx.city, hour: ctx.localHour, month, day }, 5);
  const activeBanners = banners.map(b => ({ id: b.id, title: b.title, priority: b.priority }));

  // Events
  const events = resolveActiveEvents(ctx.country, month, day);
  const eventOverrides = events.map(e => ({ eventId: e.id, name: e.name, emoji: e.emoji }));

  // Trending categories from context
  const trendingCategories = ctx.recommendedSegments.slice(0, 8);

  // Time-aware priorities
  const nearYouPriority = ctx.timeSlot === "lunch" || ctx.timeSlot === "dinner" ? 95 : 70;
  const openNowPriority = ctx.timeSlot === "late_night" ? 99 : ctx.localHour >= 21 ? 85 : 60;

  // Search suggestions
  const searchSuggestions = SEARCH_SUGGESTIONS[ctx.timeSlot] || SEARCH_SUGGESTIONS.lunch;

  // Promoted verticals
  const promotedVerticals = VERTICAL_PRIORITY[ctx.timeSlot] || ["food", "services"];

  return {
    context: ctx,
    homepageSections,
    activeBanners,
    trendingCategories,
    nearYouPriority,
    openNowPriority,
    searchSuggestions,
    promotedVerticals,
    eventOverrides,
    computedAt: new Date().toISOString(),
  };
}
