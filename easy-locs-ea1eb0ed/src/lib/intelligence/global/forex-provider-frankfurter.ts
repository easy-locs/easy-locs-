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
import { getCountryProfile } from "./country-profile-registry";

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

/** Country-specific display targets for ticker items (3-5 pairs per country). */
const COUNTRY_DISPLAY_TARGETS: Record<string, string[]> = {
  AE: ["USD", "EUR", "GBP", "SAR"],
  MA: ["EUR", "USD", "GBP"],
  EG: ["USD", "EUR", "GBP", "SAR"],
  SA: ["USD", "EUR", "GBP", "AED"],
  FR: ["USD", "GBP", "MAD", "AED"],
  DE: ["USD", "GBP", "MAD", "AED"],
  GB: ["USD", "EUR", "AED", "MAD"],
  US: ["EUR", "GBP", "AED", "JPY"],
  IN: ["USD", "EUR", "GBP"],
  JP: ["USD", "EUR", "GBP"],
  BR: ["USD", "EUR"],
  NG: ["USD", "EUR", "GBP"],
};

const DEFAULT_DISPLAY_TARGETS = ["USD", "EUR", "GBP"];
/** Expanded fallback used when country-specific targets, after base removal, yield < 3 items. */
const EXTENDED_FALLBACK_TARGETS = ["USD", "EUR", "GBP", "AED", "JPY"];

/**
 * Determine 3–5 relevant display targets for a given country using
 * CountryProfileRegistry for richer context.
 * Always guarantees at least 3 targets (absolute fallback to USD/EUR/GBP).
 */
function getDisplayTargets(country: string, baseCurrency: string): string[] {
  const profile = getCountryProfile(country.toUpperCase());
  const countrySpecific = COUNTRY_DISPLAY_TARGETS[country.toUpperCase()];

  // Start with country-specific targets if available, else use defaults
  const targets = new Set<string>(countrySpecific ?? DEFAULT_DISPLAY_TARGETS);

  // Always ensure DEFAULT_DISPLAY_TARGETS are in the pool as guaranteed fallback
  for (const t of DEFAULT_DISPLAY_TARGETS) targets.add(t);

  // If the country profile has a default currency different from base, include it
  if (profile?.defaultCurrency && profile.defaultCurrency !== baseCurrency) {
    targets.add(profile.defaultCurrency);
  }

  // Remove baseCurrency itself (cannot be a target of its own pair)
  targets.delete(baseCurrency);

  let result = Array.from(targets).slice(0, 5);

  // Guarantee minimum of 3 distinct targets — pad from extended fallback if needed
  if (result.length < 3) {
    for (const t of EXTENDED_FALLBACK_TARGETS) {
      if (t !== baseCurrency && !result.includes(t)) {
        result.push(t);
        if (result.length >= 3) break;
      }
    }
  }

  return result;
}

function canonicalizeForex(
  raw: FrankfurterResponse,
  country: string,
  baseCurrency: string,
): CanonicalGlobalFeedItem[] {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const halfHourSlot = Math.floor(now.getTime() / 1_800_000);

  const targets = getDisplayTargets(country, baseCurrency);

  const items: CanonicalGlobalFeedItem[] = [];

  for (const target of targets) {
    const rate = raw.rates[target];
    if (rate === undefined) continue;

    const rateStr = rate >= 100 ? rate.toFixed(2) : rate >= 10 ? rate.toFixed(3) : rate.toFixed(4);
    const summary = `${baseCurrency}/${target} : ${rateStr}`;

    items.push({
      id: `forex_${baseCurrency}_${target}_${halfHourSlot}`,
      sourceId: PROVIDER_ID,
      sourceName: PROVIDER_NAME,
      sourceTrust: 0.9,
      sourceTier: "tier_1",
      category: "forex",
      subcategory: "rates",
      title: `${baseCurrency}/${target}`,
      summary,
      body: null,
      language: "en",
      originalLanguage: "en",
      country: country.toUpperCase(),
      region: null,
      city: null,
      priority: "P3",
      relevanceScore: 0.65,
      freshnessScore: 0.9,
      personalRelevance: 0.6,
      publishedAt: fetchedAt,
      fetchedAt,
      expiresAt: new Date(now.getTime() + 1_800_000).toISOString(),
      tags: ["forex", "finance", baseCurrency.toLowerCase(), target.toLowerCase()],
      mediaUrl: null,
      deepLinkUrl: `/wallet/forex`,
      contentHash: `forex_${baseCurrency}_${target}_${halfHourSlot}`,
    });
  }

  return items;
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
  const baseCurrency = COUNTRY_CURRENCIES[country.toUpperCase()] ?? "EUR";

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
    const baseCurrency = COUNTRY_CURRENCIES[country.toUpperCase()] ?? "EUR";

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
