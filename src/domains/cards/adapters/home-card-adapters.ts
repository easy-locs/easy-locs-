/**
 * Card Adapters — Home Surface
 * Each adapter is the SINGLE bridge between a domain's canonical pipeline and the UI.
 * No card component may fetch data directly — it MUST use an adapter.
 */
import { useMemo } from "react";
import { buildCardContract, type CardContract } from "../card-contract";
import { useDashboardViewModel } from "@/families/dashboard/dashboard.view-model";

// ── Home Hero Card ──
export function useHeroBannerCard(): CardContract<{ title: string; subtitle: string; route: string }> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "hero_banner",
        domain: "geo",
        title: "Hero Banner",
        data: { title: vm.hero.title, subtitle: vm.hero.subtitle, route: vm.hero.route },
        deepLink: vm.hero.route,
        primaryAction: { label: vm.hero.cta, run: () => { window.location.href = vm.hero.route; } },
      }),
    [vm.hero],
  );
}

// ── Quick Actions Card ──
export function useQuickActionsCard(): CardContract<{ actions: Array<{ label: string; route: string }> }> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "quick_actions",
        domain: "wallet",
        title: "Quick Actions",
        data: {
          actions: [
            { label: "Wallet", route: "/wallet/hub" },
            { label: "QR Pay", route: "/pay" },
            { label: "Send", route: "/wallet/send" },
          ],
        },
        deepLink: "/wallet/hub",
        primaryAction: { label: "Open Wallet", run: () => { window.location.href = "/wallet/hub"; } },
      }),
    [],
  );
}

// ── Category Grid Card ──
export function useCategoryGridCard(): CardContract<{ count: number }> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "category_grid",
        domain: "marketplace",
        title: "Categories",
        data: vm.categories.length > 0 ? { count: vm.categories.length } : null,
        deepLink: "/radar",
        primaryAction: { label: "Browse All", run: () => { window.location.href = "/radar"; } },
      }),
    [vm.categories],
  );
}

// ── Context Banners Card ──
export function useContextBannersCard(): CardContract<{ banners: any[]; activeIdx: number }> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "context_banners",
        domain: "geo",
        title: "Context Banners",
        data: vm.contextBanners.length > 0 ? { banners: vm.contextBanners, activeIdx: vm.activeBannerIdx } : null,
        deepLink: "/radar",
        primaryAction: vm.contextBanners.length > 0
          ? { label: "Explore", run: () => { window.location.href = "/radar"; } }
          : undefined,
      }),
    [vm.contextBanners, vm.activeBannerIdx],
  );
}

// ── Boost Slot Hero Card ──
export function useBoostSlotHeroCard(): CardContract<{ slotActive: boolean }> {
  return useMemo(
    () =>
      buildCardContract({
        id: "boost_slot_hero",
        domain: "boost",
        title: "Boost Slot",
        data: { slotActive: true }, // BoostSlotRenderer self-manages via query
        deepLink: "/boost",
        primaryAction: { label: "Boost Now", run: () => { window.location.href = "/boost"; } },
      }),
    [],
  );
}

// ── Live Map Card ──
export function useLiveMapCard(): CardContract<{ lat: number; lng: number } | null> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "live_map",
        domain: "geo",
        title: "Live Map",
        data: vm.currentLocation,
        deepLink: "/mobility/taxi",
        disabled: !vm.currentLocation,
        disabledReason: !vm.currentLocation ? "Location not available" : undefined,
        primaryAction: vm.currentLocation
          ? { label: "Book Ride", run: () => { window.location.href = "/mobility/taxi"; } }
          : undefined,
      }),
    [vm.currentLocation],
  );
}

// ── Trending Section Card ──
export function useTrendingSectionCard(): CardContract<any[]> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "trending_section",
        domain: "marketplace",
        title: "Trending",
        data: vm.sections.trending,
        deepLink: "/radar",
        primaryAction: { label: "See All", run: () => { window.location.href = "/radar?sort=trending"; } },
      }),
    [vm.sections.trending],
  );
}

// ── Best Rated Section Card ──
export function useBestRatedSectionCard(): CardContract<any[]> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "best_rated_section",
        domain: "marketplace",
        title: "Best Rated",
        data: vm.sections.bestRated,
        deepLink: "/radar",
        primaryAction: { label: "See All", run: () => { window.location.href = "/radar?sort=rating"; } },
      }),
    [vm.sections.bestRated],
  );
}

// ── Newest Section Card ──
export function useNewestSectionCard(): CardContract<any[]> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "newest_section",
        domain: "marketplace",
        title: "New on Easy Locs",
        data: vm.sections.newest,
        deepLink: "/radar",
        primaryAction: { label: "See All", run: () => { window.location.href = "/radar?sort=newest"; } },
      }),
    [vm.sections.newest],
  );
}

// ── Near You Section Card ──
export function useNearYouSectionCard(): CardContract<any[]> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "near_you_section",
        domain: "marketplace",
        title: "Near You",
        data: vm.sections.nearYou,
        deepLink: "/radar",
        primaryAction: { label: "See All", run: () => { window.location.href = "/radar?sort=distance"; } },
      }),
    [vm.sections.nearYou],
  );
}

// ── Onboarding Checklist Card ──
export function useOnboardingChecklistCard(): CardContract<{ completed: boolean }> {
  return useMemo(
    () =>
      buildCardContract({
        id: "onboarding_checklist",
        domain: "onboarding",
        title: "Getting Started",
        data: { completed: false }, // managed by OnboardingChecklist component state
        deepLink: "/",
        primaryAction: { label: "Continue Setup", run: () => { /* handled by OnboardingChecklist */ } },
      }),
    [],
  );
}

// ── Smart Recommendations Card ──
export function useSmartRecommendationsCard(): CardContract<any[]> {
  const vm = useDashboardViewModel();
  return useMemo(
    () =>
      buildCardContract({
        id: "smart_recommendations",
        domain: "marketplace",
        title: "Recommended For You",
        data: vm.sections.nearYou,
        deepLink: "/radar",
        primaryAction: { label: "Explore", run: () => { window.location.href = "/radar"; } },
      }),
    [vm.sections.nearYou],
  );
}
