/**
 * Dashboard Read Model — Pure projections from raw data to render-ready models.
 * No side effects, no store writes, no DB access.
 */
import { getSmartCategories, getSmartHero, getTimeGreeting, type SmartCategory, type SmartHero } from "@/lib/smart-home-engine";
import { getTopBanners } from "@/lib/context-banner/context-banner-engine";
import type { ContextBanner } from "@/lib/context-banner/context-banner-engine";

// ── Hero Model ──
export interface HeroBannerModel {
  hero: SmartHero;
  greeting: string;
  locationLabel: string;
}

export function projectHeroBanner(city: string | null, timezone?: string): HeroBannerModel {
  return {
    hero: getSmartHero(timezone),
    greeting: getTimeGreeting(timezone),
    locationLabel: city || "your area",
  };
}

// ── Categories Model ──
export interface CategoriesModel {
  categories: SmartCategory[];
}

export function projectCategories(timezone?: string, countryCode?: string): CategoriesModel {
  return {
    categories: getSmartCategories(timezone, countryCode),
  };
}

// ── Context Banners Model ──
export interface ContextBannersModel {
  banners: ContextBanner[];
}

export function projectContextBanners(
  countryCode?: string | null,
  city?: string | null,
  localHour?: number,
  maxBanners = 3,
): ContextBannersModel {
  return {
    banners: getTopBanners({ country: countryCode, city, hour: localHour }, maxBanners),
  };
}
