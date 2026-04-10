import type { FlightSearchParams, FlightOffer } from "@/domains/flight/flight-types";
import { getActiveProviders, getProviderForRegion } from "./flight-provider-adapter";
import { platformBus } from "@/lib/shared/platform-bus";

interface SearchResult {
  offers: FlightOffer[];
  providers: string[];
  searchId: string;
  cached: boolean;
  timestamp: number;
}

const searchCache = new Map<string, { result: SearchResult; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function buildCacheKey(params: FlightSearchParams): string {
  return [
    params.origin,
    params.destination,
    params.departureDate,
    params.returnDate ?? "",
    params.tripType,
    params.cabinClass,
    `${params.passengers.adults}-${params.passengers.children}-${params.passengers.infants}`,
    params.directOnly ? "direct" : "any",
    params.currency,
  ].join("|");
}

function deduplicateOffers(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = offer.segments.map((s) => `${s.flightNumber}-${s.departureTime}`).join("+");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyFilters(offers: FlightOffer[], params: FlightSearchParams): FlightOffer[] {
  let filtered = offers;
  if (params.directOnly) {
    filtered = filtered.filter((o) => o.stops === 0);
  }
  if (params.maxStops !== undefined) {
    filtered = filtered.filter((o) => o.stops <= params.maxStops!);
  }
  if (params.preferredAirlines?.length) {
    const preferred = new Set(params.preferredAirlines);
    filtered = filtered.filter((o) =>
      o.segments.some((s) => preferred.has(s.airlineCode))
    );
  }
  return filtered;
}

export const flightSearchService = {
  async search(params: FlightSearchParams): Promise<SearchResult> {
    const cacheKey = buildCacheKey(params);
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }

    const searchId = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const regionCode = params.origin.length >= 2 ? params.origin.slice(0, 2).toUpperCase() : null;
    const adapters = regionCode
      ? (() => {
          const regional = getProviderForRegion(regionCode);
          return regional.length > 0 ? regional : getActiveProviders();
        })()
      : getActiveProviders();

    if (adapters.length === 0) {
      throw new Error("No flight providers available");
    }

    const allOffers: FlightOffer[] = [];
    const usedProviders: string[] = [];

    const results = await Promise.allSettled(
      adapters.map(async (adapter) => {
        const offers = await adapter.search(params);
        return { providerId: adapter.providerId, offers };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allOffers.push(...result.value.offers);
        usedProviders.push(result.value.providerId);
      }
    }

    const deduplicated = deduplicateOffers(allOffers);
    const filtered = applyFilters(deduplicated, params);
    const sorted = filtered.sort((a, b) => a.totalPrice - b.totalPrice);

    const searchResult: SearchResult = {
      offers: sorted,
      providers: usedProviders,
      searchId,
      cached: false,
      timestamp: Date.now(),
    };

    searchCache.set(cacheKey, { result: searchResult, expiresAt: Date.now() + CACHE_TTL });

    platformBus.emit("flight:search_completed", {
      searchId,
      resultCount: sorted.length,
      providers: usedProviders,
      params: { origin: params.origin, destination: params.destination },
    });

    return searchResult;
  },

  clearCache(): void {
    searchCache.clear();
  },

  getCacheSize(): number {
    let count = 0;
    const now = Date.now();
    for (const [key, entry] of searchCache) {
      if (entry.expiresAt <= now) {
        searchCache.delete(key);
      } else {
        count++;
      }
    }
    return count;
  },
};
