/**
 * Card Adapters — Per-domain hooks that produce CardContract instances.
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
      }),
    [vm.categories],
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
      }),
    [vm.sections.bestRated],
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
      }),
    [vm.contextBanners, vm.activeBannerIdx],
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
      }),
    [vm.currentLocation],
  );
}
