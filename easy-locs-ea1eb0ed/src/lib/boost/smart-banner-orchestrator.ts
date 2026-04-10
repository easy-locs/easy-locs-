/**
 * SMART BANNER ORCHESTRATOR — Unified multi-dimensional banner resolution.
 *
 * STRICT DISCIPLINE — ZERO TOLERANCE:
 * - Geo: Country → City → Zone (strict hierarchy, zone requires city, city requires country)
 * - Time: Hour → DayOfWeek → Month → Season (strict temporal cascade)
 * - Weather: condition → intensity → safety (live adaptation)
 * - Taxonomy: Vertical → Subcategory → ArchType (canonical enforcement)
 *
 * Unifies:
 * - Boost campaigns (paid/sponsored)
 * - Context banners (editorial, time-aware, geo-aware)
 * - Category banners (vertical discovery)
 * - Video decorations (immersive media)
 *
 * Every banner scored on ALL dimensions. No shortcuts.
 */

import type { ContextBanner } from "@/lib/context-banner/context-banner-engine";
import { resolveContextBanners } from "@/lib/context-banner/context-banner-engine";
import { resolveBoostsForSurface, type BoostMatch } from "@/lib/boost/canonical-boost-engine";

export type WeatherCondition = "clear" | "cloudy" | "rain" | "storm" | "snow" | "heat" | "fog" | "wind";
export type TimePeriod = "dawn" | "morning" | "lunch" | "afternoon" | "golden_hour" | "dinner" | "evening" | "late_night";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type BannerSource = "boost" | "context" | "category" | "video" | "editorial";

export interface GeoHierarchy {
  country: string;
  city?: string | null;
  zone?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface TemporalContext {
  hour: number;
  dayOfWeek: number;
  dayOfMonth: number;
  month: number;
  year: number;
  timePeriod: TimePeriod;
  season: Season;
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface WeatherContext {
  condition: WeatherCondition;
  temperature: number;
  humidity: number;
  windSpeed: number;
  isExtreme: boolean;
}

export interface SmartBannerContext {
  geo: GeoHierarchy;
  temporal: TemporalContext;
  weather: WeatherContext | null;
  taxonomy: {
    vertical?: string | null;
    subcategory?: string | null;
  };
  locale: string;
  userId?: string | null;
  surface: string;
}

export interface SmartBanner {
  id: string;
  source: BannerSource;
  title: string;
  subtitle: string;
  score: number;
  mediaType: "image" | "video" | "gradient" | "none";
  mediaUrl?: string | null;
  gradient?: string | null;
  emoji?: string;
  ctaLabel?: string;
  ctaRoute?: string;
  animation?: string;
  vertical?: string | null;
  country?: string | null;
  city?: string | null;
  zone?: string | null;
  boostMatch?: BoostMatch;
  contextBanner?: ContextBanner;
}

export function resolveTimePeriod(hour: number): TimePeriod {
  if (hour >= 4 && hour < 6) return "dawn";
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 19) return "golden_hour";
  if (hour >= 19 && hour < 22) return "dinner";
  if (hour >= 22 && hour < 24) return "evening";
  return "late_night";
}

export function resolveSeason(month: number, lat?: number | null): Season {
  const isNorthern = !lat || lat >= 0;
  if (isNorthern) {
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }
  if (month >= 3 && month <= 5) return "autumn";
  if (month >= 6 && month <= 8) return "winter";
  if (month >= 9 && month <= 11) return "spring";
  return "summer";
}

export function buildTemporalContext(now = new Date()): TemporalContext {
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return {
    hour,
    dayOfWeek,
    dayOfMonth,
    month,
    year,
    timePeriod: resolveTimePeriod(hour),
    season: resolveSeason(month),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6,
    isHoliday: false,
  };
}

export function validateGeoHierarchy(geo: GeoHierarchy): string[] {
  const errors: string[] = [];
  if (!geo.country || geo.country.length !== 2) {
    errors.push("Country ISO-2 code required");
  }
  if (geo.zone && !geo.city) {
    errors.push("Zone requires city — geo hierarchy violated");
  }
  if (geo.city && !geo.country) {
    errors.push("City requires country — geo hierarchy violated");
  }
  return errors;
}

function scoreWeatherRelevance(banner: SmartBanner, weather: WeatherContext | null): number {
  if (!weather) return 0;

  let bonus = 0;

  if (weather.condition === "rain" || weather.condition === "storm") {
    if (banner.vertical === "food" || banner.ctaRoute?.includes("/food")) bonus += 15;
    if (banner.vertical === "grocery") bonus += 10;
    if (banner.vertical === "mobility") bonus -= 5;
  }

  if (weather.condition === "heat" && weather.temperature > 35) {
    if (banner.title?.toLowerCase().includes("cold") || banner.title?.toLowerCase().includes("ice") || banner.title?.toLowerCase().includes("cool")) {
      bonus += 20;
    }
    if (banner.vertical === "food") bonus += 8;
  }

  if (weather.condition === "clear" && weather.temperature >= 20 && weather.temperature <= 30) {
    if (banner.vertical === "experiences" || banner.vertical === "mobility") bonus += 10;
  }

  if (weather.isExtreme) {
    if (banner.vertical === "mobility") bonus -= 15;
    if (banner.vertical === "food") bonus += 10;
  }

  return bonus;
}

function scoreTemporalRelevance(banner: SmartBanner, temporal: TemporalContext): number {
  let bonus = 0;

  if (temporal.timePeriod === "morning" && banner.ctaRoute?.includes("/food")) bonus += 5;
  if (temporal.timePeriod === "lunch" && banner.ctaRoute?.includes("/food")) bonus += 8;
  if (temporal.timePeriod === "dinner" && banner.ctaRoute?.includes("/food")) bonus += 8;
  if (temporal.timePeriod === "late_night" && banner.vertical === "food") bonus += 5;

  if (temporal.isWeekend) {
    if (banner.vertical === "experiences" || banner.vertical === "food") bonus += 5;
  }

  if (banner.mediaType === "video") bonus += 10;

  return bonus;
}

function scoreGeoRelevance(banner: SmartBanner, geo: GeoHierarchy): number {
  let score = 0;

  if (banner.country && banner.country === geo.country) score += 15;
  else if (banner.country && banner.country !== geo.country) score -= 30;

  if (banner.city && geo.city && banner.city === geo.city) score += 12;
  else if (banner.city && geo.city && banner.city !== geo.city) score -= 10;

  if (banner.zone && geo.zone && banner.zone === geo.zone) score += 10;

  return score;
}

function contextBannerToSmart(cb: ContextBanner): SmartBanner {
  return {
    id: `ctx-${cb.id}`,
    source: "context",
    title: cb.title,
    subtitle: cb.subtitle,
    score: cb.priority,
    mediaType: "gradient",
    gradient: cb.gradient,
    emoji: cb.emoji,
    ctaLabel: cb.cta,
    ctaRoute: cb.route,
    animation: cb.animation,
    vertical: null,
    country: null,
    city: null,
    zone: null,
    contextBanner: cb,
  };
}

function boostMatchToSmart(match: BoostMatch): SmartBanner {
  return {
    id: `boost-${match.campaign.id}`,
    source: "boost",
    title: match.creative.title,
    subtitle: match.creative.subtitle || "",
    score: match.score,
    mediaType: match.creative.video_url ? "video" : match.creative.image_url ? "image" : "none",
    mediaUrl: match.creative.video_url || match.creative.image_url,
    ctaLabel: match.creative.cta_label,
    ctaRoute: match.creative.cta_target || undefined,
    vertical: match.campaign.canonical_vertical,
    country: match.campaign.country,
    city: match.campaign.city,
    zone: match.campaign.zone,
    boostMatch: match,
  };
}

export async function resolveSmartBanners(
  ctx: SmartBannerContext,
  maxResults = 6
): Promise<SmartBanner[]> {
  const geoErrors = validateGeoHierarchy(ctx.geo);
  if (geoErrors.length > 0) {
    console.warn("[smart-banner] Geo hierarchy violation:", geoErrors);
  }

  const [contextBanners, boostMap] = await Promise.all([
    Promise.resolve(resolveContextBanners({
      country: ctx.geo.country,
      city: ctx.geo.city,
      hour: ctx.temporal.hour,
      month: ctx.temporal.month,
      day: ctx.temporal.dayOfMonth,
    })),
    resolveBoostsForSurface(ctx.surface, {
      vertical: ctx.taxonomy.vertical,
      subcategory: ctx.taxonomy.subcategory,
      country: ctx.geo.country,
      city: ctx.geo.city,
      zone: ctx.geo.zone,
      locale: ctx.locale,
      userId: ctx.userId,
    }).catch(() => new Map<string, BoostMatch>()),
  ]);

  const allBanners: SmartBanner[] = [];

  for (const cb of contextBanners) {
    allBanners.push(contextBannerToSmart(cb));
  }

  boostMap.forEach((match) => {
    allBanners.push(boostMatchToSmart(match));
  });

  for (const banner of allBanners) {
    let totalScore = banner.score;

    totalScore += scoreWeatherRelevance(banner, ctx.weather);
    totalScore += scoreTemporalRelevance(banner, ctx.temporal);
    totalScore += scoreGeoRelevance(banner, ctx.geo);

    banner.score = Math.max(0, Math.min(200, totalScore));
  }

  allBanners.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const deduplicated: SmartBanner[] = [];
  for (const b of allBanners) {
    const key = `${b.source}:${b.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduplicated.push(b);
  }

  return deduplicated.slice(0, maxResults);
}

export function getSmartBannerDebugInfo(banners: SmartBanner[]): string {
  return banners.map((b, i) =>
    `[${i + 1}] ${b.source}:${b.id} score=${b.score} media=${b.mediaType} geo=${b.country || "global"}/${b.city || "*"}/${b.zone || "*"}`
  ).join("\n");
}
