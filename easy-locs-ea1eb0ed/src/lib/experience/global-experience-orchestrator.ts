/**
 * GLOBAL EXPERIENCE ORCHESTRATOR
 * Central brain — consumes all existing engines, produces a single GlobalExperienceState.
 * Pure orchestration layer. No duplication of engine logic.
 */

import { computeGlobalContext } from "@/lib/context/global-context-engine";
import { composeLivingPage } from "@/lib/commerce/living-commerce-engine";
import { getTopBanners, type ContextBanner } from "@/lib/context-banner/context-banner-engine";
import { resolveActiveEvents } from "./global-event-registry";
import {
  type GlobalExperienceState,
  type ExperienceBanner,
  type ExperienceVisualTheme,
  type ExperienceMotionPreset,
  type ExperiencePageComposition,
  EXPERIENCE_LIMITS,
} from "./global-experience-types";

// ── Adapters (bridge existing engines → orchestrator types) ──

function adaptBanners(banners: ContextBanner[]): ExperienceBanner[] {
  return banners.slice(0, EXPERIENCE_LIMITS.maxBannersPerSurface).map(b => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    emoji: b.emoji,
    gradient: b.gradient,
    cta: b.cta,
    route: b.route,
    priority: b.priority,
  }));
}

function resolveVisualTheme(themeKey: string, events: { themeKey: string }[]): ExperienceVisualTheme {
  const eventTheme = events.find(e => e.themeKey !== "default")?.themeKey || themeKey;

  const gradientMap: Record<string, string> = {
    ramadan: "linear-gradient(135deg, hsl(260 40% 25% / 0.08), hsl(45 80% 55% / 0.05))",
    eid: "linear-gradient(135deg, hsl(45 90% 55% / 0.08), hsl(30 80% 50% / 0.05))",
    christmas: "linear-gradient(135deg, hsl(0 70% 45% / 0.06), hsl(120 50% 35% / 0.05))",
    summer: "linear-gradient(135deg, hsl(195 80% 55% / 0.06), hsl(45 80% 60% / 0.04))",
    national_day: "linear-gradient(135deg, hsl(0 70% 50% / 0.06), hsl(120 60% 40% / 0.06))",
  };

  const accentMap: Record<string, ExperienceVisualTheme["accentMode"]> = {
    ramadan: "warm", eid: "festive", christmas: "festive", summer: "cool", national_day: "warm",
  };

  return {
    themeKey: eventTheme,
    gradient: gradientMap[eventTheme] || null,
    accentMode: accentMap[eventTheme] || "default",
    badgeStyle: eventTheme !== "default" ? "glow" : "default",
    bannerStyle: eventTheme !== "default" ? "immersive" : "default",
  };
}

function resolveMotionPreset(timeSlot: string | null): ExperienceMotionPreset {
  // Late night = calmer; daytime = more energetic
  if (timeSlot === "late_night") {
    return { page: "fadeOnly", section: "fadeSlideUp", card: "fadeSlideUp", cta: "spring", banner: "fadeSlideUp" };
  }
  return { page: "fadeSlideUp", section: "stagger", card: "scaleIn", cta: "spring", banner: "fadeSlideUp" };
}

function resolveCategoryPriorities(segments: string[], timeSlot: string | null): Record<string, string[]> {
  // Time-aware category ordering
  const priorities: Record<string, string[]> = {
    food: [],
    grocery: ["essentials", "fresh", "beverages", "snacks"],
    shops: ["fashion", "electronics", "home"],
    services: ["cleaning", "repair", "beauty"],
  };

  // Food priorities driven by context engine segments
  priorities.food = segments.slice(0, EXPERIENCE_LIMITS.maxHighlightedCategories);

  return priorities;
}

// ── Cache ──

let _lastState: GlobalExperienceState | null = null;
let _lastComputeTime = 0;

// ── Main Compute ──

export function computeGlobalExperience(input?: {
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
}): GlobalExperienceState {
  const now = Date.now();

  // Debounce: return cached if within threshold
  if (_lastState && (now - _lastComputeTime) < EXPERIENCE_LIMITS.debounceMs) {
    return _lastState;
  }

  // 1. Consume Global Context Engine (existing)
  const ctx = computeGlobalContext({
    country: input?.country,
    city: input?.city,
    timezone: input?.timezone,
  });

  // 2. Consume Event Registry (new, centralized)
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  const activeEvents = resolveActiveEvents(ctx.country, month, day);

  // 3. Consume Banner Engine (existing)
  const rawBanners = getTopBanners({
    country: ctx.country,
    city: ctx.city,
    hour: ctx.localHour,
    month,
    day,
  }, EXPERIENCE_LIMITS.maxBannersPerSurface);
  const activeBanners = adaptBanners(rawBanners);

  // 4. Consume Living Commerce Engine (existing) for page compositions
  const surfaces = ["home", "search", "radar", "shop", "vertical", "category"];
  const pageComposition: Record<string, ExperiencePageComposition> = {};

  for (const surface of surfaces) {
    const living = composeLivingPage({
      country: ctx.country,
      city: ctx.city,
      maxSections: EXPERIENCE_LIMITS.maxSectionsPerPage,
    });
    pageComposition[surface] = {
      sections: living.activeSections.map(s => ({
        id: s.id,
        type: s.type,
        title: s.title,
        emoji: s.emoji,
        priority: s.priority,
        targetSubs: s.targetSubs,
      })),
      featuredEntityIds: [],
      highlightedCategories: living.highlightedCategories.slice(0, EXPERIENCE_LIMITS.maxHighlightedCategories),
      highlightedSubcategories: living.highlightedSubcategories.slice(0, EXPERIENCE_LIMITS.maxHighlightedSubcategories),
    };
  }

  // 5. Visual theme from events
  const visualTheme = resolveVisualTheme(ctx.visualTheme, activeEvents);

  // 6. Motion preset
  const timeSlot = ctx.timeSlot === "early_morning" ? "morning" : ctx.timeSlot;
  const motionPreset = resolveMotionPreset(timeSlot);

  // 7. Category priorities
  const categoryPriorities = resolveCategoryPriorities(ctx.recommendedSegments, timeSlot);

  // 8. Freshness
  const freshnessLevel = activeEvents.length > 0 ? "high" as const
    : ctx.isWeekend ? "medium" as const
    : "low" as const;

  const state: GlobalExperienceState = {
    initialized: true,
    context: {
      country: ctx.country,
      city: ctx.city,
      timezone: ctx.timezone,
      localHour: ctx.localHour,
      dayOfWeek: ctx.dayOfWeek,
      month,
      season: ctx.season,
      timeSlot: timeSlot as GlobalExperienceState["context"]["timeSlot"],
      isWeekend: ctx.isWeekend,
    },
    activeEvents,
    activeBanners,
    pageComposition,
    visualTheme,
    motionPreset,
    categoryPriorities,
    freshness: {
      level: freshnessLevel,
      newEntityIds: [],
      trendingEntityIds: [],
    },
    lastComputedAt: new Date().toISOString(),
  };

  _lastState = state;
  _lastComputeTime = now;

  return state;
}

/** Force recompute (bypass debounce) */
export function forceRecomputeExperience(input?: {
  country?: string | null;
  city?: string | null;
}): GlobalExperienceState {
  _lastComputeTime = 0;
  return computeGlobalExperience(input);
}
