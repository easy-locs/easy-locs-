import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
import type { IntelligenceProvider, ProviderHealth, ProviderMeta } from "./provider-adapter";
import {
  createCircuitBreaker,
  createProviderCache,
  createRateLimiter,
  fetchWithDedup,
  applyAntiStorm,
} from "./provider-resilience";
import type { CircuitBreaker, ProviderCache, RateLimiter } from "./provider-resilience";

const PROVIDER_ID = "google_news_rss";
const PROVIDER_NAME = "Google News";
const CACHE_TTL_MS = 600_000;
const CACHE_MAX_STALE_MS = 3_600_000;
const TIMEOUT_MS = 10_000;
const MAX_ITEMS = 20;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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

interface RssProxyItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
}

interface RssProxyResponse {
  status: string;
  items: RssProxyItem[];
  cached?: boolean;
}

function buildEdgeFunctionUrl(country: string, city?: string): string {
  const params = new URLSearchParams({ country });
  if (city) params.set("city", city);
  return `${SUPABASE_URL}/functions/v1/rss-proxy?${params.toString()}`;
}

function toCanonicalItems(proxyItems: RssProxyItem[], country: string, city: string | undefined): CanonicalGlobalFeedItem[] {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();

  return proxyItems.slice(0, MAX_ITEMS).map((item, idx) => {
    let publishedAt: string;
    try {
      const d = new Date(item.pubDate);
      publishedAt = Number.isNaN(d.getTime()) ? now : d.toISOString();
    } catch {
      publishedAt = now;
    }

    const sourceName = item.source || PROVIDER_NAME;
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
      summary: item.description || titleClean,
      body: null,
      language: COUNTRY_NEWS_CONFIG[country]?.hl ?? "en",
      originalLanguage: COUNTRY_NEWS_CONFIG[country]?.hl ?? "en",
      country,
      region: null,
      city: city ?? null,
      priority: "P3" as const,
      relevanceScore: 0.7 - idx * 0.02,
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
    console.warn(`[news-provider] Circuit breaker open for ${country}, returning stale data`);
    const stale = cache.getStale(cacheKey);
    return stale ?? [];
  }

  if (!rateLimiter.canRequest(country)) {
    console.warn(`[news-provider] Rate limiter blocked for ${country}, returning stale data`);
    const stale = cache.getStale(cacheKey);
    return stale ?? [];
  }

  return fetchWithDedup(dedupKey, async () => {
    const apiUrl = buildEdgeFunctionUrl(country, city);

    try {
      rateLimiter.recordRequest(country);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            "apikey": SUPABASE_ANON_KEY ?? "",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY ?? ""}`,
          },
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) {
        console.warn(`[news-provider] HTTP ${response.status} for ${country}, failure #${consecutiveFailures + 1}`);
        breaker.recordFailure();
        consecutiveFailures++;
        const stale = cache.getStale(cacheKey);
        return stale ?? [];
      }
      const json: RssProxyResponse = await response.json();
      if (json.status !== "ok" || !Array.isArray(json.items)) {
        console.warn(`[news-provider] Invalid response for ${country}: status=${json.status}, failure #${consecutiveFailures + 1}`);
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
    } catch (err) {
      console.warn(`[news-provider] Fetch failed for ${country}, failure #${consecutiveFailures + 1}:`, err);
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
