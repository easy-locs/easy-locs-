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
import { isMarketHours } from "./timezone-resolver";

const PROVIDER_ID = "frankfurter_forex";
const PROVIDER_NAME = "Frankfurter (ECB)";
const CACHE_TTL_MARKET_MS = 300_000;
const CACHE_TTL_OFF_HOURS_MS = 1_800_000;
const CACHE_MAX_STALE_MS = 7_200_000;
const TIMEOUT_MS = 5_000;

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

const COUNTRY_CURRENCIES: Record<string, string> = {
  AE: "AED",
  FR: "EUR",
  US: "USD",
  GB: "GBP",
  SA: "SAR",
  EG: "EGP",
  MA: "MAD",
  DE: "EUR",
  IN: "INR",
  BR: "BRL",
  NG: "NGN",
  JP: "JPY",
};

const DISPLAY_TARGETS = ["USD", "EUR", "GBP"];

function canonicalizeForex(
  raw: FrankfurterResponse,
  country: string,
  baseCurrency: string,
): CanonicalGlobalFeedItem[] {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const halfHourSlot = Math.floor(now.getTime() / 1_800_000);

  const rateLines: string[] = [];
  for (const target of DISPLAY_TARGETS) {
    if (target === baseCurrency) continue;
    const rate = raw.rates[target];
    if (rate !== undefined) {
      rateLines.push(`${baseCurrency}/${target}: ${rate.toFixed(4)}`);
    }
  }
  if (rateLines.length === 0) {
    const entries = Object.entries(raw.rates).slice(0, 3);
    for (const [cur, rate] of entries) {
      rateLines.push(`${baseCurrency}/${cur}: ${rate.toFixed(4)}`);
    }
  }

  const summary = rateLines.join(" | ");

  const item: CanonicalGlobalFeedItem = {
    id: `forex_${baseCurrency}_${now.getTime()}`,
    sourceId: PROVIDER_ID,
    sourceName: PROVIDER_NAME,
    sourceTrust: 0.9,
    sourceTier: "tier_1",
    category: "forex",
    subcategory: "rates",
    title: `${baseCurrency} Exchange Rates`,
    summary,
    body: null,
    language: "en",
    originalLanguage: "en",
    country: country.toUpperCase(),
    region: null,
    city: null,
    priority: "P3",
    relevanceScore: 0.6,
    freshnessScore: 0.9,
    personalRelevance: 0.5,
    publishedAt: fetchedAt,
    fetchedAt,
    expiresAt: new Date(now.getTime() + 1_800_000).toISOString(),
    tags: ["forex", "finance", baseCurrency.toLowerCase()],
    mediaUrl: null,
    deepLinkUrl: null,
    contentHash: `forex_${baseCurrency}_${halfHourSlot}`,
  };

  return [item];
}

const breaker: CircuitBreaker = createCircuitBreaker(PROVIDER_ID);
const cacheMarket: ProviderCache = createProviderCache(CACHE_TTL_MARKET_MS, CACHE_MAX_STALE_MS);
const cacheOffHours: ProviderCache = createProviderCache(CACHE_TTL_OFF_HOURS_MS, CACHE_MAX_STALE_MS);
const rateLimiter: RateLimiter = createRateLimiter();

let lastFetchMs = 0;
let consecutiveFailures = 0;

function getCache(country: string): ProviderCache {
  return isMarketHours(country) ? cacheMarket : cacheOffHours;
}

async function fetchForex(country: string): Promise<CanonicalGlobalFeedItem[]> {
  const baseCurrency = COUNTRY_CURRENCIES[country.toUpperCase()];
  if (!baseCurrency) return [];

  const activeCache = getCache(country);
  const cacheKey = `forex_rates_${baseCurrency}`;
  const dedupKey = `${PROVIDER_ID}_${country}_national`;

  const cached = activeCache.get(cacheKey);
  if (cached) return cached;

  if (!breaker.canRequest()) {
    const stale = activeCache.getStale(cacheKey);
    return stale ?? [];
  }

  if (!rateLimiter.canRequest(country)) {
    const stale = activeCache.getStale(cacheKey);
    return stale ?? [];
  }

  return fetchWithDedup(dedupKey, async () => {
    try {
      rateLimiter.recordRequest(country);
      const url = `https://api.frankfurter.app/latest?from=${baseCurrency}`;
      const response = await fetchWithRetry(url, TIMEOUT_MS);
      if (!response.ok) {
        breaker.recordFailure();
        consecutiveFailures++;
        const stale = activeCache.getStale(cacheKey);
        return stale ?? [];
      }
      const raw: FrankfurterResponse = await response.json();
      const items = canonicalizeForex(raw, country, baseCurrency);
      const bounded = applyAntiStorm(items);
      breaker.recordSuccess();
      consecutiveFailures = 0;
      lastFetchMs = Date.now();
      activeCache.set(cacheKey, bounded);
      return bounded;
    } catch {
      breaker.recordFailure();
      consecutiveFailures++;
      const stale = activeCache.getStale(cacheKey);
      return stale ?? [];
    }
  });
}

const meta: ProviderMeta = {
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  tier: "tier_1",
  categories: ["forex"],
  countries: ["*"],
  refreshIntervalMs: CACHE_TTL_MARKET_MS,
};

export const frankfurterProvider: IntelligenceProvider = {
  meta,
  fetch(country: string, _city?: string): CanonicalGlobalFeedItem[] {
    const baseCurrency = COUNTRY_CURRENCIES[country.toUpperCase()];
    if (!baseCurrency) return [];

    const activeCache = getCache(country);
    const cacheKey = `forex_rates_${baseCurrency}`;
    const cached = activeCache.get(cacheKey);
    if (cached) return cached;

    void fetchForex(country);

    const stale = activeCache.getStale(cacheKey);
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
