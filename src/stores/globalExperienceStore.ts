/**
 * GLOBAL EXPERIENCE STORE
 * Zustand store — single source of truth for the orchestrated experience state.
 * Pages read from here. Orchestrator writes here.
 */

import { create } from "zustand";
import type { GlobalExperienceState } from "@/lib/experience/global-experience-types";
import { computeGlobalExperience, forceRecomputeExperience } from "@/lib/experience/global-experience-orchestrator";

interface ExperienceStore extends GlobalExperienceState {
  /** Recompute the full experience state */
  refresh: (input?: { country?: string | null; city?: string | null }) => void;
  /** Force recompute bypassing debounce */
  forceRefresh: (input?: { country?: string | null; city?: string | null }) => void;
}

const INITIAL: GlobalExperienceState = {
  initialized: false,
  context: {
    country: null, city: null, timezone: null,
    localHour: null, dayOfWeek: null, month: null,
    season: null, timeSlot: null, isWeekend: false,
  },
  activeEvents: [],
  activeBanners: [],
  pageComposition: {},
  visualTheme: {
    themeKey: "default", gradient: null,
    accentMode: "default", badgeStyle: "default", bannerStyle: "default",
  },
  motionPreset: {
    page: "fadeSlideUp", section: "stagger",
    card: "scaleIn", cta: "spring", banner: "fadeSlideUp",
  },
  categoryPriorities: {},
  freshness: { level: "low", newEntityIds: [], trendingEntityIds: [] },
  lastComputedAt: null,
};

export const useGlobalExperienceStore = create<ExperienceStore>((set) => ({
  ...INITIAL,

  refresh: (input) => {
    const state = computeGlobalExperience(input);
    set(state);
  },

  forceRefresh: (input) => {
    const state = forceRecomputeExperience(input);
    set(state);
  },
}));
