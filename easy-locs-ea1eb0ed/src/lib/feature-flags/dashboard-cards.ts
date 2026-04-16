/**
 * Dashboard cards feature flag registry.
 *
 * Every dashboard card is keyed here. A card is RENDERED only when its flag
 * is enabled AND its backing source is reachable. When the source becomes
 * unreachable at runtime the card must set its flag to `false` via
 * `setDashboardCardReachable(key, false)` so the shell hides it cleanly.
 *
 * This replaces silent placeholder/fake data: if a card cannot prove a live
 * pipeline, it must disappear, not ship broken.
 */

export type DashboardCardKey =
  | "topHero"
  | "prayerTimes"
  | "intelligenceTicker"
  | "engineHealth"
  | "forex"
  | "news"
  | "mlRecommendations"
  | "activeCart"
  | "smartQuickActions"
  | "contextualNudge"
  | "quickAccessStrip"
  | "continueSection"
  | "pendingActions"
  | "smartSuggestions"
  | "c2cBanner"
  | "suggestedPayments"
  | "orbitPreview"
  | "realEstateAnalytics"
  | "referralCredit"
  | "propertyCockpit"
  | "liveTracking"
  | "serviceMenu"
  | "essentialServices"
  | "browseCategories"
  | "contextBanners"
  | "heroSlideCarousel"
  | "boostSlotHero"
  | "radarPreview"
  | "dashboardStories"
  | "featuredHotels"
  | "sectionTrending"
  | "sectionBestRated"
  | "sectionNewest"
  | "sectionNearYou"
  | "boostSlotInline"
  | "currencyWallet";

const DEFAULT_FLAGS: Record<DashboardCardKey, boolean> = {
  topHero: true,
  prayerTimes: true,
  intelligenceTicker: true,
  engineHealth: true,
  forex: true,
  news: true,
  mlRecommendations: true,
  activeCart: true,
  smartQuickActions: true,
  contextualNudge: true,
  quickAccessStrip: true,
  continueSection: true,
  pendingActions: true,
  smartSuggestions: true,
  c2cBanner: true,
  suggestedPayments: true,
  orbitPreview: true,
  realEstateAnalytics: true,
  referralCredit: true,
  propertyCockpit: true,
  liveTracking: true,
  serviceMenu: true,
  essentialServices: true,
  browseCategories: true,
  contextBanners: true,
  heroSlideCarousel: true,
  boostSlotHero: true,
  radarPreview: true,
  dashboardStories: true,
  // featuredHotels is backed by a static FALLBACK_HOTELS catalogue (no
  // live backend). Default to OFF until a real source is wired.
  featuredHotels: false,
  sectionTrending: true,
  sectionBestRated: true,
  sectionNewest: true,
  sectionNearYou: true,
  boostSlotInline: true,
  currencyWallet: true,
};

const reachability = new Map<DashboardCardKey, boolean>();
const listeners = new Set<() => void>();

function readLocalOverride(key: DashboardCardKey): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(`dashboardCards.${key}`);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function isDashboardCardEnabled(key: DashboardCardKey): boolean {
  const override = readLocalOverride(key);
  if (override !== null) return override;
  if (!DEFAULT_FLAGS[key]) return false;
  const reachable = reachability.get(key);
  // If never reported, assume reachable so the card can attempt to load.
  // Once a card reports `false`, it stays disabled until it reports `true` again.
  return reachable !== false;
}

export function setDashboardCardReachable(key: DashboardCardKey, reachable: boolean): void {
  const prev = reachability.get(key);
  if (prev === reachable) return;
  reachability.set(key, reachable);
  listeners.forEach((l) => l());
}

export function subscribeDashboardCards(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

import { useSyncExternalStore } from "react";

export function useDashboardCardEnabled(key: DashboardCardKey): boolean {
  return useSyncExternalStore(
    subscribeDashboardCards,
    () => isDashboardCardEnabled(key),
    () => isDashboardCardEnabled(key),
  );
}

export function getDashboardCardsSnapshot(): Record<DashboardCardKey, boolean> {
  const out = { ...DEFAULT_FLAGS };
  for (const k of Object.keys(out) as DashboardCardKey[]) {
    out[k] = isDashboardCardEnabled(k);
  }
  return out;
}

