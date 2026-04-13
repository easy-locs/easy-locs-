/**
 * Dashboard View Model — Single reactive hook for SmartHome.
 * Consolidates ALL inline business logic from SmartHome into one clean hook.
 * Components consume this view model and render purely.
 */
import { useMemo, useState, useEffect, useCallback } from "react";
import { useLocationSelectors, selectCachedGeo, selectTimezone, persistGeoCache } from "./dashboard.selectors";
import { projectHeroBanner, projectCategories, projectContextBanners } from "./dashboard.read-model";
import { useHomeSections } from "@/hooks/useHomeSections";
import { useGlobalContext } from "@/hooks/useGlobalContext";
import { useLivingPage } from "@/hooks/useLivingPage";
import { platformBus } from "@/lib/shared/platform-bus";
import type { SmartCategory, SmartHero } from "@/lib/smart-home-engine";
import type { ContextBanner } from "@/lib/context-banner/context-banner-engine";
import type { HomeShopPreview } from "@/hooks/useHomeSections";

export interface DashboardSections {
  trending: HomeShopPreview[];
  bestRated: HomeShopPreview[];
  newest: HomeShopPreview[];
  nearYou: HomeShopPreview[];
}

export interface DashboardViewModel {
  // Hero
  hero: SmartHero;
  greeting: string;
  locationLabel: string;

  // Location
  city: string | null;
  countryCode: string | undefined;
  currentLocation: { lat: number; lng: number } | null;

  // Categories
  categories: SmartCategory[];

  // Sections (data-driven, fully typed)
  sections: DashboardSections;

  // Context Banners
  contextBanners: ContextBanner[];
  activeBannerIdx: number;

  // Address sheet
  addressSheetOpen: boolean;
  onLocationTap: () => void;
  onAddressSheetChange: (open: boolean) => void;
}

const EMPTY_SECTIONS: DashboardSections = {
  trending: [],
  bestRated: [],
  newest: [],
  nearYou: [],
};

export function useDashboardViewModel(): DashboardViewModel {
  const { currentLocation, isFallback } = useLocationSelectors();
  const timezone = useMemo(() => selectTimezone(), []);

  // ── City resolution ──
  const cachedGeo = useMemo(() => selectCachedGeo(), []);
  const [city, setCity] = useState<string | null>(cachedGeo.city);
  const countryCode = cachedGeo.country ?? undefined;

  useEffect(() => {
    if (!currentLocation || isFallback) return;
    if (city && city !== "your area") return;

    import("@/lib/mapbox/geocoding").then(({ reverseGeocode }) => {
      reverseGeocode(currentLocation.lat, currentLocation.lng)
        .then((res) => {
          const place = res?.features?.[0];
          if (place) {
            const cityCtx = place.context?.find((c: { id?: string }) => c.id?.startsWith("place"));
            const cityName = cityCtx?.text || place.text;
            if (cityName) {
              setCity(cityName);
              persistGeoCache(cityName, "AE");
            }
          }
        })
        .catch(() => {});
    });
  }, [currentLocation, isFallback, city]);

  // ── Read models (pure projections) ──
  const heroModel = useMemo(() => projectHeroBanner(city, timezone), [city, timezone]);
  const categoriesModel = useMemo(() => projectCategories(timezone, countryCode), [timezone, countryCode]);

  // ── Sections from canonical pipeline ──
  const { data: rawSections } = useHomeSections();
  const sections: DashboardSections = rawSections ?? EMPTY_SECTIONS;

  useEffect(() => {
    if (rawSections) {
      const count = Object.values(rawSections).filter((arr) => Array.isArray(arr) && arr.length > 0).length;
      platformBus.emit("dashboard:sections_refreshed", { sectionCount: count }, "dashboard");
    }
  }, [rawSections]);

  // ── Context banners ──
  const _living = useLivingPage({ country: countryCode, city: city || undefined, maxSections: 6 });
  const globalCtx = useGlobalContext({ country: countryCode, city: city || undefined });

  const bannersModel = useMemo(
    () => projectContextBanners(countryCode, city, globalCtx.localHour, 3),
    [countryCode, city, globalCtx.localHour],
  );

  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  useEffect(() => {
    if (bannersModel.banners.length <= 1) return;
    const iv = setInterval(() => setActiveBannerIdx((i) => (i + 1) % bannersModel.banners.length), 5000);
    return () => clearInterval(iv);
  }, [bannersModel.banners.length]);

  // ── Address sheet ──
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const onLocationTap = useCallback(() => setAddressSheetOpen(true), []);

  return {
    hero: heroModel.hero,
    greeting: heroModel.greeting,
    locationLabel: heroModel.locationLabel,
    city,
    countryCode,
    currentLocation,
    categories: categoriesModel.categories,
    sections,
    contextBanners: bannersModel.banners,
    activeBannerIdx,
    addressSheetOpen,
    onLocationTap,
    onAddressSheetChange: setAddressSheetOpen,
  };
}
