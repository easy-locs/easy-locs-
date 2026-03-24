/**
 * useAppTranslation — Unified translation hook for the entire app.
 * Bridges canonical i18n (tc) with discovery i18n (td) and legacy i18n (useI18n).
 * 
 * Usage:
 *   const { tc, td, locale, isRTL } = useAppTranslation();
 *   <p>{tc("commerce.add_to_cart")}</p>
 *   <p>{td("discovery.vertical.food.tagline")}</p>
 */
import { useMemo } from "react";
import { tc as translateCanonical, getAppLocale, isRTL, type AppLocale } from "@/lib/i18n-canonical";
import { td as translateDiscovery } from "@/lib/i18n-discovery";

export interface AppTranslation {
  /** Translate app-wide key (nav, orbit, commerce, wallet, settings, common, auth) */
  tc: typeof translateCanonical;
  /** Translate discovery key (verticals, subcategories, travel) */
  td: typeof translateDiscovery;
  /** Current locale */
  locale: AppLocale;
  /** Is RTL (Arabic) */
  isRTL: boolean;
}

export function useAppTranslation(): AppTranslation {
  return useMemo(() => ({
    tc: translateCanonical,
    td: translateDiscovery,
    locale: getAppLocale(),
    isRTL: isRTL(),
  }), []);
}
