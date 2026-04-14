/**
 * Prayer Times Intelligence Provider
 * Fetches Islamic prayer times via the Supabase prayer-times edge function
 * (which proxies Al-Adhan API with 24h caching).
 *
 * Only active for countries with `religionModuleAvailable: true`:
 * AE, SA, EG, MA, NG …
 */

import type { CanonicalGlobalFeedItem, GlobalFeedCategory } from "@/domains/shared/canonical-types";
import type { IntelligenceProvider, ProviderHealth, ProviderMeta } from "./provider-adapter";
import {
  createCircuitBreaker,
  createProviderCache,
  createRateLimiter,
  fetchWithDedup,
} from "./provider-resilience";
import type { CircuitBreaker, ProviderCache, RateLimiter } from "./provider-resilience";

const PROVIDER_ID = "aladhan_prayer_times";
const PROVIDER_NAME = "Al-Adhan Prayer Times";
const CACHE_TTL_MS = 3_600_000;
const CACHE_MAX_STALE_MS = 86_400_000;

export const PRAYER_COUNTRIES = [
  "AE", "SA", "EG", "MA", "NG", "PK", "BD", "TR", "ID", "MY",
  "IQ", "SY", "JO", "LB", "KW", "QA", "BH", "OM", "LY", "TN",
  "DZ", "SD", "YE", "SO", "MR", "SN", "ML",
];

export interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
  hijri_date: string;
  timezone: string;
  method: number;
  lat: number;
  lng: number;
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 25.2048, lng: 55.2708 },
  SA: { lat: 24.7136, lng: 46.6753 },
  EG: { lat: 30.0444, lng: 31.2357 },
  MA: { lat: 33.5731, lng: -7.5898 },
  NG: { lat: 9.0579, lng: 7.4951 },
  PK: { lat: 33.6844, lng: 73.0479 },
  BD: { lat: 23.8103, lng: 90.4125 },
  TR: { lat: 39.9334, lng: 32.8597 },
  ID: { lat: -6.2088, lng: 106.8456 },
  MY: { lat: 3.1390, lng: 101.6869 },
  IQ: { lat: 33.3152, lng: 44.3661 },
  JO: { lat: 31.9539, lng: 35.9106 },
  KW: { lat: 29.3759, lng: 47.9774 },
  QA: { lat: 25.2854, lng: 51.5310 },
  DZ: { lat: 36.7372, lng: 3.0865 },
  TN: { lat: 36.8065, lng: 10.1815 },
  LY: { lat: 32.8872, lng: 13.1913 },
  SD: { lat: 15.5007, lng: 32.5599 },
  SN: { lat: 14.7167, lng: -17.4677 },
};

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "AE_dubai": { lat: 25.2048, lng: 55.2708 },
  "AE_abu_dhabi": { lat: 24.4539, lng: 54.3773 },
  "SA_riyadh": { lat: 24.7136, lng: 46.6753 },
  "SA_jeddah": { lat: 21.4858, lng: 39.1925 },
  "SA_makkah": { lat: 21.3891, lng: 39.8579 },
  "EG_cairo": { lat: 30.0444, lng: 31.2357 },
  "MA_casablanca": { lat: 33.5731, lng: -7.5898 },
  "MA_marrakech": { lat: 31.6295, lng: -7.9811 },
};

function resolveCoords(country: string, city?: string): { lat: number; lng: number } | null {
  if (city) {
    const key = `${country.toUpperCase()}_${city.toLowerCase()}`;
    if (CITY_COORDINATES[key]) return CITY_COORDINATES[key];
  }
  return COUNTRY_COORDINATES[country.toUpperCase()] ?? null;
}

export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0] ?? "0") * 60 + parseInt(parts[1] ?? "0");
}

export function getNextPrayer(data: PrayerTimesData): { name: string; timeStr: string; minutesLeft: number } | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: "Fajr", timeStr: data.fajr },
    { name: "Dhuhr", timeStr: data.dhuhr },
    { name: "Asr", timeStr: data.asr },
    { name: "Maghrib", timeStr: data.maghrib },
    { name: "Isha", timeStr: data.isha },
  ];

  for (const p of prayers) {
    const pMinutes = parseTimeToMinutes(p.timeStr);
    if (pMinutes > nowMinutes) {
      return { ...p, minutesLeft: pMinutes - nowMinutes };
    }
  }

  const fajrMin = parseTimeToMinutes(data.fajr);
  return { name: "Fajr", timeStr: data.fajr, minutesLeft: 1440 - nowMinutes + fajrMin };
}

export async function fetchPrayerTimesFromEdge(lat: number, lng: number): Promise<PrayerTimesData | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

    if (supabaseUrl && anonKey) {
      const url = `${supabaseUrl}/functions/v1/prayer-times?lat=${lat}&lng=${lng}&method=2`;
      const resp = await fetch(url, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.data) return json.data as PrayerTimesData;
      }
    }

    // Direct Al-Adhan fallback
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json.code !== 200 || !json.data?.timings) return null;
    const t = json.data.timings;
    const d = json.data.date;
    return {
      fajr: t.Fajr,
      sunrise: t.Sunrise,
      dhuhr: t.Dhuhr,
      asr: t.Asr,
      maghrib: t.Maghrib,
      isha: t.Isha,
      date: d.gregorian?.date ?? "",
      hijri_date: d.hijri?.date ?? "",
      timezone: json.data.meta?.timezone ?? "UTC",
      method: 2,
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

function buildTickerItem(
  data: PrayerTimesData,
  country: string,
  city: string | null
): CanonicalGlobalFeedItem[] {
  const next = getNextPrayer(data);
  if (!next) return [];

  const h = Math.floor(next.minutesLeft / 60);
  const m = next.minutesLeft % 60;
  const countdownText = h > 0 ? `${h}h ${m}min` : `${m}min`;
  const summary = `Prochaine prière : ${next.name} dans ${countdownText} (${next.timeStr})`;

  const now = new Date();
  return [{
    id: `prayer_next_${country}_${city ?? "national"}_${now.getTime()}`,
    sourceId: PROVIDER_ID,
    sourceName: PROVIDER_NAME,
    sourceTrust: 0.95,
    sourceTier: "tier_1",
    category: "religious",
    subcategory: "prayer_times",
    title: `Prière ${next.name}`,
    summary,
    body: null,
    language: "fr",
    originalLanguage: "ar",
    country: country.toUpperCase(),
    region: null,
    city,
    priority: "P2",
    relevanceScore: 0.85,
    freshnessScore: 1.0,
    personalRelevance: 0.9,
    publishedAt: now.toISOString(),
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + next.minutesLeft * 60_000).toISOString(),
    tags: ["prayer", "religious", "adhan"],
    mediaUrl: null,
    deepLinkUrl: "/dashboard/prayer-times",
    contentHash: `prayer_next_${country}_${city ?? "national"}_${next.name}`,
  }];
}

const breaker: CircuitBreaker = createCircuitBreaker(PROVIDER_ID);
const cache: ProviderCache = createProviderCache(CACHE_TTL_MS, CACHE_MAX_STALE_MS);
const rateLimiter: RateLimiter = createRateLimiter();

let lastFetchMs = 0;
let consecutiveFailures = 0;

const meta: ProviderMeta = {
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  tier: "tier_1",
  categories: ["religious" as const] as GlobalFeedCategory[],
  countries: PRAYER_COUNTRIES,
  refreshIntervalMs: CACHE_TTL_MS,
};

export const prayerTimesProvider: IntelligenceProvider = {
  meta,
  fetch(country: string, city?: string): CanonicalGlobalFeedItem[] {
    if (!PRAYER_COUNTRIES.includes(country.toUpperCase())) return [];

    const cacheKey = `prayer_times_${country}_${city ?? "national"}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    if (!breaker.canRequest()) {
      return cache.getStale(cacheKey) ?? [];
    }

    const coords = resolveCoords(country, city);
    if (!coords) return [];

    const dedupKey = `${PROVIDER_ID}_${country}_${city ?? "national"}`;

    void fetchWithDedup(dedupKey, async () => {
      try {
        rateLimiter.recordRequest(country);
        const data = await fetchPrayerTimesFromEdge(coords.lat, coords.lng);
        if (!data) {
          breaker.recordFailure();
          consecutiveFailures++;
          return [];
        }
        const items = buildTickerItem(data, country, city ?? null);
        cache.set(cacheKey, items);
        breaker.recordSuccess();
        consecutiveFailures = 0;
        lastFetchMs = Date.now();
        return items;
      } catch {
        breaker.recordFailure();
        consecutiveFailures++;
        return [];
      }
    });

    return cache.getStale(cacheKey) ?? [];
  },
  health(): ProviderHealth {
    return {
      healthy: breaker.canRequest(),
      latencyMs: lastFetchMs > 0 ? Date.now() - lastFetchMs : 0,
      lastCheckAt: new Date().toISOString(),
      consecutiveFailures,
    };
  },
};
