import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
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

const PROVIDER_ID = "google_news_rss";
const PROVIDER_NAME = "Google News";
const CACHE_TTL_MS = 600_000;
const CACHE_MAX_STALE_MS = 3_600_000;
const TIMEOUT_MS = 8_000;
const MAX_ITEMS = 8;

const RSS2JSON_BASE = "https://api.rss2json.com/v1/api.json";

const COUNTRY_NEWS_CONFIG: Record<string, { hl: string; gl: string; ceid: string }> = {
  AE: { hl: "en", gl: "AE", ceid: "AE:en" },
  FR: { hl: "fr", gl: "FR", ceid: "FR:fr" },
  US: { hl: "en", gl: "US", ceid: "US:en" },
  GB: { hl: "en", gl: "GB", ceid: "GB:en" },
  SA: { hl: "ar", gl: "SA", ceid: "SA:ar" },
  EG: { hl: "ar", gl: "EG", ceid: "EG:ar" },
  MA: { hl: "fr", gl: "MA", ceid: "MA:fr" },
  DE: { hl: "de", gl: "DE", ceid: "DE:de" },
  IN: { hl: "en", gl: "IN", ceid: "IN:en" },
  BR: { hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" },
  NG: { hl: "en", gl: "NG", ceid: "NG:en" },
  JP: { hl: "ja", gl: "JP", ceid: "JP:ja" },
};

const DEFAULT_CONFIG = { hl: "en", gl: "US", ceid: "US:en" };

interface Rss2JsonItem {
  title: string;
  pubDate: string;
  link: string;
  author: string;
  description: string;
  content: string;
}

interface Rss2JsonResponse {
  status: string;
  items: Rss2JsonItem[];
}

function buildRssUrl(country: string, city?: string): string {
  const config = COUNTRY_NEWS_CONFIG[country] ?? DEFAULT_CONFIG;
  if (city) {
    const encodedCity = encodeURIComponent(city);
    return `https://news.google.com/rss/search?q=${encodedCity}&hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;
  }
  return `https://news.google.com/rss?hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;
}

function extractSourceFromDescription(description: string): string {
  const match = description.match(/<font[^>]*>([^<]+)<\/font>/);
  return match?.[1]?.trim() ?? PROVIDER_NAME;
}

function toCanonicalItems(jsonItems: Rss2JsonItem[], country: string, city: string | undefined): CanonicalGlobalFeedItem[] {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();

  return jsonItems.slice(0, MAX_ITEMS).map((item, idx) => {
    let publishedAt: string;
    try {
      const d = new Date(item.pubDate);
      publishedAt = Number.isNaN(d.getTime()) ? now : d.toISOString();
    } catch {
      publishedAt = now;
    }

    const sourceName = extractSourceFromDescription(item.description) || item.author || PROVIDER_NAME;
    const titleClean = item.title.replace(/ - [^-]+$/, "").trim();
    const hash = `news_${country}_${titleClean.slice(0, 40).replace(/\s+/g, "_")}_${Math.floor(Date.now() / 3_600_000)}`;

    return {
      id: `news_${country}_${Date.now()}_${idx}`,
      sourceId: PROVIDER_ID,
      sourceName,
      sourceTrust: 0.75,
      sourceTier: "tier_2" as const,
      category: "news" as const,
      subcategory: "local",
      title: titleClean,
      summary: titleClean,
      body: null,
      language: COUNTRY_NEWS_CONFIG[country]?.hl ?? "en",
      originalLanguage: COUNTRY_NEWS_CONFIG[country]?.hl ?? "en",
      country,
      region: null,
      city: city ?? null,
      priority: "P3" as const,
      relevanceScore: 0.7 - idx * 0.03,
      freshnessScore: 0.85,
      personalRelevance: 0.5,
      publishedAt,
      fetchedAt: now,
      expiresAt,
      tags: ["news", "local", country.toLowerCase()],
      mediaUrl: null,
      deepLinkUrl: item.link || null,
      contentHash: hash,
    };
  });
}

const breaker: CircuitBreaker = createCircuitBreaker(PROVIDER_ID);
const cache: ProviderCache = createProviderCache(CACHE_TTL_MS, CACHE_MAX_STALE_MS);
const rateLimiter: RateLimiter = createRateLimiter();

let lastFetchMs = 0;
let consecutiveFailures = 0;

async function fetchNews(countryRaw: string, city?: string): Promise<CanonicalGlobalFeedItem[]> {
  const country = countryRaw.toUpperCase();
  const cacheKey = `news_${country}_${city ?? "national"}`;
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
    const rssUrl = buildRssUrl(country, city);
    const apiUrl = `${RSS2JSON_BASE}?rss_url=${encodeURIComponent(rssUrl)}`;

    try {
      rateLimiter.recordRequest(country);
      const response = await fetchWithRetry(apiUrl, TIMEOUT_MS);
      if (!response.ok) {
        breaker.recordFailure();
        consecutiveFailures++;
        const stale = cache.getStale(cacheKey);
        return stale ?? [];
      }
      const json: Rss2JsonResponse = await response.json();
      if (json.status !== "ok" || !Array.isArray(json.items)) {
        breaker.recordFailure();
        consecutiveFailures++;
        const stale = cache.getStale(cacheKey);
        return stale ?? [];
      }
      const items = toCanonicalItems(json.items, country, city);
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
  tier: "tier_2",
  categories: ["news"],
  countries: ["*"],
  refreshIntervalMs: CACHE_TTL_MS,
};

export { fetchNews };

export const googleNewsProvider: IntelligenceProvider = {
  meta,
  fetch(countryRaw: string, city?: string): CanonicalGlobalFeedItem[] {
    const country = countryRaw.toUpperCase();
    const cacheKey = `news_${country}_${city ?? "national"}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    void fetchNews(country, city);

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
