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
import { getFallbackNews } from "./news-fallback-data";

const PROVIDER_ID = "google_news_rss";
const PROVIDER_NAME = "Google News";
const CACHE_TTL_MS = 600_000;
const CACHE_MAX_STALE_MS = 3_600_000;
const TIMEOUT_MS = 8_000;
const CORS_PROXY_TIMEOUT_MS = 8_000;
const MAX_ITEMS = 20;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

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
  content: string | null;
}

interface RssProxyResponse {
  status: string;
  items: RssProxyItem[];
  cached?: boolean;
}

function newsLog(step: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  console.log(`[news-provider][${ts}] ${step}`, data ?? "");
}

function buildGoogleNewsRssUrl(country: string, city?: string): string {
  const config = COUNTRY_NEWS_CONFIG[country] ?? DEFAULT_CONFIG;
  if (city) {
    const encodedCity = encodeURIComponent(city);
    return `https://news.google.com/rss/search?q=${encodedCity}&hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;
  }
  return `https://news.google.com/rss?hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;
}

function buildEdgeFunctionUrl(country: string, city?: string): string {
  const params = new URLSearchParams({ country });
  if (city) params.set("city", city);
  return `${SUPABASE_URL}/functions/v1/rss-proxy?${params.toString()}`;
}

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`);
  const match = xml.match(regex);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function extractSource(description: string): string {
  const match = description.match(/<font[^>]*>([^<]+)<\/font>/);
  return match?.[1]?.trim() ?? "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlPreserveParagraphs(html: string): string {
  return html
    .replace(/<\s*\/?\s*(p|div|br|h[1-6]|li|tr|blockquote)\b[^>]*\/?>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseRssXml(xml: string): RssProxyItem[] {
  const articles: RssProxyItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < MAX_ITEMS) {
    const block = match[1];
    const title = extractText(block, "title");
    const link = extractText(block, "link");
    const pubDate = extractText(block, "pubDate");
    const description = extractText(block, "description");
    const source = extractSource(description) || extractText(block, "source") || "";

    if (title && link) {
      const cleanTitle = title.replace(/ - [^-]+$/, "").trim();
      const cleanDescription = stripHtml(description);
      const summaryText = cleanDescription && cleanDescription !== source
        ? cleanDescription
        : cleanTitle;

      const contentEncoded = extractText(block, "content:encoded");
      const contentTag = extractText(block, "content");
      const rawContent = contentEncoded || contentTag || "";
      const cleanContent = rawContent ? stripHtmlPreserveParagraphs(rawContent) : null;
      const isSameAsSummary = cleanContent && summaryText &&
        cleanContent.replace(/\s+/g, "").slice(0, 80) === summaryText.replace(/\s+/g, "").slice(0, 80);
      const bodyContent = cleanContent && cleanContent.length > 20 && !isSameAsSummary ? cleanContent : null;

      articles.push({
        title: cleanTitle,
        link,
        pubDate,
        source,
        description: summaryText,
        content: bodyContent,
      });
    }
  }

  return articles;
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
      body: item.content || null,
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

export function resetNewsProviderState(): void {
  breaker.reset();
  rateLimiter.reset();
  cache.clear();
  consecutiveFailures = 0;
  newsLog("reset", { message: "Circuit breaker, rate limiter, cache and failure count reset" });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryEdgeFunction(country: string, city?: string): Promise<{ items: CanonicalGlobalFeedItem[]; source: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    newsLog("edge_function_skip", { reason: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
    return null;
  }

  const apiUrl = buildEdgeFunctionUrl(country, city);
  newsLog("edge_function_attempt", { url: apiUrl, country, city });

  try {
    const response = await fetchWithTimeout(apiUrl, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }, TIMEOUT_MS);

    if (!response.ok) {
      newsLog("edge_function_http_error", { status: response.status, country });
      return null;
    }

    const json: RssProxyResponse = await response.json();
    if (json.status !== "ok" || !Array.isArray(json.items) || json.items.length === 0) {
      newsLog("edge_function_empty", { status: json.status, itemCount: json.items?.length ?? 0 });
      return null;
    }

    const items = toCanonicalItems(json.items, country, city);
    newsLog("edge_function_success", { itemCount: items.length, cached: json.cached });
    return { items, source: "edge_function" };
  } catch (err) {
    newsLog("edge_function_error", { error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

async function tryCorsProxy(country: string, city?: string): Promise<{ items: CanonicalGlobalFeedItem[]; source: string } | null> {
  const rssUrl = buildGoogleNewsRssUrl(country, city);

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyUrl = CORS_PROXIES[i](rssUrl);
    newsLog("cors_proxy_attempt", { proxyIndex: i, country, city });

    try {
      const response = await fetchWithTimeout(proxyUrl, {}, CORS_PROXY_TIMEOUT_MS);

      if (!response.ok) {
        newsLog("cors_proxy_http_error", { proxyIndex: i, status: response.status });
        continue;
      }

      const xml = await response.text();
      if (!xml.includes("<item>")) {
        newsLog("cors_proxy_no_items", { proxyIndex: i });
        continue;
      }

      const rssItems = parseRssXml(xml);
      if (rssItems.length === 0) {
        newsLog("cors_proxy_parse_empty", { proxyIndex: i });
        continue;
      }

      const items = toCanonicalItems(rssItems, country, city);
      newsLog("cors_proxy_success", { proxyIndex: i, itemCount: items.length });
      return { items, source: `cors_proxy_${i}` };
    } catch (err) {
      newsLog("cors_proxy_error", { proxyIndex: i, error: err instanceof Error ? err.message : "unknown" });
      continue;
    }
  }

  return null;
}

async function fetchNews(countryRaw: string, city?: string): Promise<CanonicalGlobalFeedItem[]> {
  const country = countryRaw.toUpperCase();
  const cacheKey = `news_${country}_${city ?? "national"}`;
  const dedupKey = `${PROVIDER_ID}_${country}_${city ?? "national"}`;

  newsLog("fetch_start", { country, city, cacheKey });

  const cached = cache.get(cacheKey);
  if (cached) {
    newsLog("cache_hit", { cacheKey, itemCount: cached.length });
    return cached;
  }

  if (!breaker.canRequest()) {
    newsLog("circuit_breaker_open", { country });
    const stale = cache.getStale(cacheKey);
    if (stale) {
      newsLog("returning_stale", { cacheKey, itemCount: stale.length });
      return stale;
    }
    const fallback = getFallbackNews(country);
    newsLog("returning_fallback_from_breaker", { country, itemCount: fallback.length });
    return fallback;
  }

  if (!rateLimiter.canRequest(country)) {
    newsLog("rate_limited", { country });
    const stale = cache.getStale(cacheKey);
    if (stale) return stale;
    return getFallbackNews(country);
  }

  return fetchWithDedup(dedupKey, async () => {
    rateLimiter.recordRequest(country);

    let result = await tryEdgeFunction(country, city);

    if (!result) {
      newsLog("edge_function_failed_trying_cors", { country });
      result = await tryCorsProxy(country, city);
    }

    if (result && result.items.length > 0) {
      const bounded = applyAntiStorm(result.items);
      breaker.recordSuccess();
      consecutiveFailures = 0;
      lastFetchMs = Date.now();
      cache.set(cacheKey, bounded);
      newsLog("fetch_complete", { source: result.source, itemCount: bounded.length, country });
      return bounded;
    }

    breaker.recordFailure();
    consecutiveFailures++;
    newsLog("all_sources_failed", { country, consecutiveFailures });

    const stale = cache.getStale(cacheKey);
    if (stale && stale.length > 0) {
      newsLog("returning_stale_after_failure", { cacheKey, itemCount: stale.length });
      return stale;
    }

    const fallback = getFallbackNews(country);
    newsLog("returning_static_fallback", { country, itemCount: fallback.length });
    return fallback;
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
    if (stale) return stale;

    return getFallbackNews(country);
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
