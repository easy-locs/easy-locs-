/**
 * useGlobalExperience — Primary hook for all pages.
 * Returns the orchestrated experience state from the global store.
 * Pages consume, never compute.
 */

import { useGlobalExperienceStore } from "@/stores/globalExperienceStore";
import type {
  ExperienceBanner,
  ExperienceEvent,
  ExperiencePageComposition,
  ExperienceVisualTheme,
  ExperienceMotionPreset,
  GlobalExperienceState,
} from "@/lib/experience/global-experience-types";

export function useGlobalExperience() {
  return useGlobalExperienceStore();
}

/** Surface-specific composition */
export function usePageComposition(surface: string): ExperiencePageComposition | null {
  return useGlobalExperienceStore(s => s.pageComposition[surface] ?? null);
}

/** Active banners for a surface (max 3) */
export function useExperienceBanners(): ExperienceBanner[] {
  return useGlobalExperienceStore(s => s.activeBanners);
}

/** Active events */
export function useActiveEvents(): ExperienceEvent[] {
  return useGlobalExperienceStore(s => s.activeEvents);
}

/** Visual theme */
export function useVisualTheme(): ExperienceVisualTheme {
  return useGlobalExperienceStore(s => s.visualTheme);
}

/** Motion preset */
export function useMotionPreset(): ExperienceMotionPreset {
  return useGlobalExperienceStore(s => s.motionPreset);
}

/** Category priorities for a vertical */
export function useCategoryPriorities(vertical: string): string[] {
  return useGlobalExperienceStore(s => s.categoryPriorities[vertical] ?? []);
}

/** Freshness signals */
export function useFreshness(): GlobalExperienceState["freshness"] {
  return useGlobalExperienceStore(s => s.freshness);
}
