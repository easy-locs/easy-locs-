import type { CanonicalGlobalFeedItem, GlobalFeedPriority } from "@/domains/shared/canonical-types";
import type { IntelligenceProvider, ProviderHealth, ProviderMeta } from "./provider-adapter";
import {
  createCircuitBreaker,
  createProviderCache,
  createRateLimiter,
  fetchWithDedup,
  fetchWithRetry,
  applyAntiStorm,
} from "./provider-resilience";
import type { CircuitBreaker, ProviderCache, RateLimiter } from "./provider-resilience";

const PROVIDER_ID = "openmeteo_weather";
const PROVIDER_NAME = "Open-Meteo Weather";
const CACHE_TTL_MS = 900_000;
const CACHE_MAX_STALE_MS = 3_600_000;
const TIMEOUT_MS = 5_000;

interface OpenMeteoCurrentWeather {
  temperature: number;
  windspeed: number;
  weathercode: number;
  is_day: number;
  time: string;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current_weather?: OpenMeteoCurrentWeather;
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    weathercode: number[];
  };
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "AE_dubai": { lat: 25.2048, lng: 55.2708 },
  "AE_abu_dhabi": { lat: 24.4539, lng: 54.3773 },
  "AE_sharjah": { lat: 25.3463, lng: 55.4209 },
  "FR_paris": { lat: 48.8566, lng: 2.3522 },
  "FR_lyon": { lat: 45.7640, lng: 4.8357 },
  "FR_marseille": { lat: 43.2965, lng: 5.3698 },
  "US_new_york": { lat: 40.7128, lng: -74.0060 },
  "US_los_angeles": { lat: 34.0522, lng: -118.2437 },
  "US_chicago": { lat: 41.8781, lng: -87.6298 },
  "GB_london": { lat: 51.5074, lng: -0.1278 },
  "GB_manchester": { lat: 53.4808, lng: -2.2426 },
  "SA_riyadh": { lat: 24.7136, lng: 46.6753 },
  "SA_jeddah": { lat: 21.4858, lng: 39.1925 },
  "SA_makkah": { lat: 21.3891, lng: 39.8579 },
  "EG_cairo": { lat: 30.0444, lng: 31.2357 },
  "EG_alexandria": { lat: 31.2001, lng: 29.9187 },
  "MA_casablanca": { lat: 33.5731, lng: -7.5898 },
  "MA_marrakech": { lat: 31.6295, lng: -7.9811 },
  "DE_berlin": { lat: 52.5200, lng: 13.4050 },
  "IN_mumbai": { lat: 19.0760, lng: 72.8777 },
  "IN_delhi": { lat: 28.7041, lng: 77.1025 },
  "BR_sao_paulo": { lat: -23.5505, lng: -46.6333 },
  "NG_lagos": { lat: 6.5244, lng: 3.3792 },
  "JP_tokyo": { lat: 35.6762, lng: 139.6503 },
};

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 25.2048, lng: 55.2708 },
  FR: { lat: 48.8566, lng: 2.3522 },
  US: { lat: 40.7128, lng: -74.0060 },
  GB: { lat: 51.5074, lng: -0.1278 },
  SA: { lat: 24.7136, lng: 46.6753 },
  EG: { lat: 30.0444, lng: 31.2357 },
  MA: { lat: 33.5731, lng: -7.5898 },
  DE: { lat: 52.5200, lng: 13.4050 },
  IN: { lat: 19.0760, lng: 72.8777 },
  BR: { lat: -23.5505, lng: -46.6333 },
  NG: { lat: 6.5244, lng: 3.3792 },
  JP: { lat: 35.6762, lng: 139.6503 },
};

const WMO_WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const SEVERE_CODES = new Set([65, 75, 82, 86, 95, 96, 99]);

function resolveCoordinates(country: string, city?: string): { lat: number; lng: number } | null {
  if (city) {
    const key = `${country.toUpperCase()}_${city.toLowerCase()}`;
    if (CITY_COORDINATES[key]) return CITY_COORDINATES[key];
  }
  return COUNTRY_COORDINATES[country.toUpperCase()] ?? null;
}

function canonicalizeWeather(
  raw: OpenMeteoResponse,
  country: string,
  city: string | null,
): CanonicalGlobalFeedItem[] {
  const items: CanonicalGlobalFeedItem[] = [];
  const now = new Date();
  const fetchedAt = now.toISOString();

  if (raw.current_weather) {
    const cw = raw.current_weather;
    const description = WMO_WEATHER_CODES[cw.weathercode] ?? "Unknown";
    const isSevere = SEVERE_CODES.has(cw.weathercode);
    const priority: GlobalFeedPriority = isSevere ? "P0" : "P3";
    const hourSlot = Math.floor(now.getTime() / 3_600_000);

    items.push({
      id: `weather_current_${country}_${city ?? "national"}_${now.getTime()}`,
      sourceId: PROVIDER_ID,
      sourceName: PROVIDER_NAME,
      sourceTrust: 0.9,
      sourceTier: "tier_1",
      category: "weather",
      subcategory: isSevere ? "severe" : "current",
      title: `Weather in ${city ?? country}`,
      summary: `${description}, ${Math.round(cw.temperature)}°C, wind ${Math.round(cw.windspeed)} km/h`,
      body: null,
      language: "en",
      originalLanguage: "en",
      country: country.toUpperCase(),
      region: null,
      city: city,
      priority,
      relevanceScore: isSevere ? 0.9 : 0.6,
      freshnessScore: 0.95,
      personalRelevance: 0.5,
      publishedAt: fetchedAt,
      fetchedAt,
      expiresAt: new Date(now.getTime() + (isSevere ? 1_800_000 : 3_600_000)).toISOString(),
      tags: ["weather", isSevere ? "severe" : "current"],
      mediaUrl: null,
      deepLinkUrl: null,
      contentHash: `weather_current_${country}_${city ?? "national"}_${hourSlot}`,
    });
  }

  return items;
}

const breaker: CircuitBreaker = createCircuitBreaker(PROVIDER_ID);
const cache: ProviderCache = createProviderCache(CACHE_TTL_MS, CACHE_MAX_STALE_MS);
const rateLimiter: RateLimiter = createRateLimiter();

let lastFetchMs = 0;
let consecutiveFailures = 0;

async function fetchWeather(country: string, city?: string): Promise<CanonicalGlobalFeedItem[]> {
  const cacheKey = `weather_current_${country}_${city ?? "national"}`;
  const dedupKey = `${PROVIDER_ID}_${country}_${city ?? "national"}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!breaker.canRequest()) {
    const stale = cache.getStale(cacheKey);
    return stale ?? [];
  }

  if (!rateLimiter.canRequest(country)) {
    const stale = cache.getStale(cacheKey);
    return stale ?? [];
  }

  return fetchWithDedup(dedupKey, async () => {
    const coords = resolveCoordinates(country, city);
    if (!coords) return [];

    try {
      rateLimiter.recordRequest(country);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true&timezone=auto`;
      const response = await fetchWithRetry(url, TIMEOUT_MS);
      if (!response.ok) {
        breaker.recordFailure();
        consecutiveFailures++;
        const stale = cache.getStale(cacheKey);
        return stale ?? [];
      }
      const raw: OpenMeteoResponse = await response.json();
      const items = canonicalizeWeather(raw, country, city ?? null);
      const bounded = applyAntiStorm(items);
      breaker.recordSuccess();
      consecutiveFailures = 0;
      lastFetchMs = Date.now();
      cache.set(cacheKey, bounded);
      return bounded;
    } catch {
      breaker.recordFailure();
      consecutiveFailures++;
      const stale = cache.getStale(cacheKey);
      return stale ?? [];
    }
  });
}

const meta: ProviderMeta = {
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  tier: "tier_1",
  categories: ["weather"],
  countries: ["*"],
  refreshIntervalMs: CACHE_TTL_MS,
};

export const openMeteoProvider: IntelligenceProvider = {
  meta,
  fetch(country: string, city?: string): CanonicalGlobalFeedItem[] {
    const cacheKey = `weather_current_${country}_${city ?? "national"}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    void fetchWeather(country, city);

    const stale = cache.getStale(cacheKey);
    return stale ?? [];
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
