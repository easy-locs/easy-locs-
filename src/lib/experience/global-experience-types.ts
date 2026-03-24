/**
 * GLOBAL EXPERIENCE TYPES
 * Single type definition consumed by the entire experience orchestrator.
 * No logic here — pure contract.
 */

export type ExperienceTimeSlot = "morning" | "lunch" | "afternoon" | "dinner" | "late_night";

export interface ExperienceEvent {
  id: string;
  type: "religious" | "national" | "commercial" | "seasonal";
  name: string;
  emoji: string;
  country?: string | null;
  region?: string | null;
  priority: number;
  themeKey: string;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface ExperienceBanner {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  gradient: string;
  cta?: string;
  route?: string;
  priority: number;
  themeKey?: string;
  surfaceTargets?: string[];
}

export interface ExperienceSection {
  id: string;
  type: string;
  title: string;
  emoji: string;
  priority: number;
  targetSubs: string[];
}

export interface ExperiencePageComposition {
  sections: ExperienceSection[];
  featuredEntityIds: string[];
  highlightedCategories: string[];
  highlightedSubcategories: string[];
}

export interface ExperienceVisualTheme {
  themeKey: string;
  gradient: string | null;
  accentMode: "default" | "warm" | "festive" | "cool" | "luxury";
  badgeStyle: "default" | "glow" | "outline";
  bannerStyle: "default" | "immersive" | "minimal";
}

export interface ExperienceMotionPreset {
  page: "fadeSlideUp" | "fadeOnly" | "scaleIn";
  section: "stagger" | "fadeSlideUp" | "fadeOnly";
  card: "scaleIn" | "fadeSlideUp";
  cta: "spring" | "snap";
  banner: "fadeSlideUp" | "slideRight";
}

export interface GlobalExperienceState {
  initialized: boolean;

  context: {
    country: string | null;
    city: string | null;
    timezone: string | null;
    localHour: number | null;
    dayOfWeek: number | null;
    month: number | null;
    season: string | null;
    timeSlot: ExperienceTimeSlot | null;
    isWeekend: boolean;
  };

  activeEvents: ExperienceEvent[];
  activeBanners: ExperienceBanner[];

  pageComposition: Record<string, ExperiencePageComposition>;

  visualTheme: ExperienceVisualTheme;
  motionPreset: ExperienceMotionPreset;

  categoryPriorities: Record<string, string[]>;

  freshness: {
    level: "low" | "medium" | "high";
    newEntityIds: string[];
    trendingEntityIds: string[];
  };

  lastComputedAt: string | null;
}

/** Guardrails config */
export const EXPERIENCE_LIMITS = {
  maxBannersPerSurface: 3,
  maxSectionsPerPage: 5,
  maxHighlightedCategories: 6,
  maxHighlightedSubcategories: 10,
  refreshIntervalMs: 5 * 60_000,
  /** Minimum ms between full recomputes */
  debounceMs: 30_000,
} as const;
