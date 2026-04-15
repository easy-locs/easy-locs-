import { fetchNews, resetNewsProviderState } from "@/lib/intelligence/global/news-provider";
import { fetchMultiSourceNews, isMultiSourceAvailable } from "@/lib/intelligence/global/news-multi-source";
import { bootProviders } from "@/lib/intelligence/global/provider-boot";
import { getFallbackNews } from "@/lib/intelligence/global/news-fallback-data";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

const LOCALSTORAGE_KEY = "easylocs_news_cache";
const INITIAL_TIMEOUT_MS = 5_000;

interface CachedNewsData {
  items: CanonicalGlobalFeedItem[];
  country: string;
  city: string | undefined;
  fetchedAt: number;
  source: string;
  contentHash: string;
}

function serviceLog(step: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  console.log(`[news-service][${ts}] ${step}`, data ?? "");
}

function computeContentHash(items: CanonicalGlobalFeedItem[]): string {
  if (items.length === 0) return "empty";
  const raw = items.map(i => `${i.title}|${i.publishedAt}`).join(";");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `h_${(hash >>> 0).toString(36)}_${items.length}`;
}

function loadFromLocalStorage(): CachedNewsData | null {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedNewsData;
    const age = Date.now() - parsed.fetchedAt;
    if (age > 3_600_000) {
      serviceLog("localstorage_expired", { ageMs: age });
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return null;
    }
    if (parsed.items && parsed.items.length > 0) {
      serviceLog("localstorage_loaded", { itemCount: parsed.items.length, ageMs: age, source: parsed.source });
      return parsed;
    }
  } catch (err) {
    serviceLog("localstorage_read_error", { error: err instanceof Error ? err.message : "unknown" });
  }
  return null;
}

function saveToLocalStorage(data: CachedNewsData): void {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
    serviceLog("localstorage_saved", { itemCount: data.items.length, source: data.source });
  } catch (err) {
    serviceLog("localstorage_write_error", { error: err instanceof Error ? err.message : "unknown" });
  }
}

let _cachedNews: CachedNewsData | null = null;
let _refreshTimer: ReturnType<typeof setInterval> | null = null;
let _country = "FR";
let _city: string | undefined;
let _consecutiveFailures = 0;
let _isRefreshing = false;

const REFRESH_MS = 300_000;
const MAX_RETRY_BACKOFF_MS = 60_000;

if (!_cachedNews) {
  const stored = loadFromLocalStorage();
  if (stored) {
    _cachedNews = stored;
    serviceLog("boot_cache_restored", { itemCount: stored.items.length, source: stored.source });
  }
}

export function getNewsServiceCache(): CachedNewsData | null {
  return _cachedNews;
}

export function setNewsServiceLocation(country: string, city?: string): void {
  const changed = country !== _country || city !== _city;
  _country = country;
  _city = city;
  if (changed && _refreshTimer) {
    serviceLog("location_changed", { country, city });
    refreshNewsData();
  }
}

export function resetNewsResilience(): void {
  resetNewsProviderState();
  _consecutiveFailures = 0;
  serviceLog("resilience_reset", { message: "All resilience state cleared for manual retry" });
}

export async function refreshNewsData(force: boolean = false): Promise<CachedNewsData | null> {
  if (_isRefreshing && !force) {
    serviceLog("refresh_skipped", { reason: "already refreshing" });
    return _cachedNews;
  }

  _isRefreshing = true;
  serviceLog("refresh_start", { country: _country, city: _city, force });

  try {
    bootProviders();

    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), INITIAL_TIMEOUT_MS));
    const useMultiSource = isMultiSourceAvailable();
    const fetchFn = useMultiSource ? fetchMultiSourceNews : fetchNews;
    const fetchPromise = fetchFn(_country, _city).then(items => items).catch(err => {
      serviceLog("fetch_error", { error: err instanceof Error ? err.message : "unknown", multiSource: useMultiSource });
      return [] as CanonicalGlobalFeedItem[];
    });

    const items = await Promise.race([fetchPromise, timeoutPromise]);

    if (items === null) {
      serviceLog("fetch_timeout", { timeoutMs: INITIAL_TIMEOUT_MS, country: _country });

      fetchPromise.then(laterItems => {
        if (laterItems && laterItems.length > 0) {
          const lateSource = laterItems[0]?.sourceId === "fallback_static" ? "fallback" : "live";
          serviceLog("late_fetch_arrived", { itemCount: laterItems.length, source: lateSource });
          updateCache(laterItems, lateSource);
        }
      });

      if (_cachedNews && _cachedNews.items.length > 0) {
        serviceLog("timeout_using_existing_cache", { itemCount: _cachedNews.items.length });
        return _cachedNews;
      }

      const fallback = getFallbackNews(_country);
      updateCache(fallback, "fallback");
      serviceLog("timeout_using_fallback", { itemCount: fallback.length });
      return _cachedNews;
    }

    if (items.length > 0) {
      const newHash = computeContentHash(items);
      const oldHash = _cachedNews?.contentHash ?? "";
      const isNewContent = newHash !== oldHash;

      const source = items[0]?.sourceId === "fallback_static" ? "fallback" : "live";

      updateCache(items, source, isNewContent);
      _consecutiveFailures = 0;
      serviceLog("refresh_success", { itemCount: items.length, source, isNewContent, hash: newHash });
    } else {
      _consecutiveFailures++;
      serviceLog("refresh_empty", { consecutiveFailures: _consecutiveFailures });

      if (!_cachedNews || _cachedNews.items.length === 0) {
        const fallback = getFallbackNews(_country);
        updateCache(fallback, "fallback");
        serviceLog("empty_result_using_fallback", { itemCount: fallback.length });
      }
    }

    return _cachedNews;
  } catch (err) {
    _consecutiveFailures++;
    serviceLog("refresh_error", { error: err instanceof Error ? err.message : "unknown", consecutiveFailures: _consecutiveFailures });

    if (!_cachedNews || _cachedNews.items.length === 0) {
      const fallback = getFallbackNews(_country);
      updateCache(fallback, "fallback");
    }

    return _cachedNews;
  } finally {
    _isRefreshing = false;
  }
}

function updateCache(items: CanonicalGlobalFeedItem[], source: string, isNewContent: boolean = true): void {
  const newHash = computeContentHash(items);
  _cachedNews = {
    items,
    country: _country,
    city: _city,
    fetchedAt: isNewContent ? Date.now() : (_cachedNews?.fetchedAt ?? Date.now()),
    source,
    contentHash: newHash,
  };
  saveToLocalStorage(_cachedNews);
  emitUpdate();
}

function emitUpdate(): void {
  try {
    import("@/lib/shared/platform-bus").then(({ platformBus }) => {
      platformBus.emit("news:data:updated", {
        itemCount: _cachedNews?.items.length ?? 0,
        country: _country,
        fetchedAt: _cachedNews?.fetchedAt ?? 0,
        source: _cachedNews?.source ?? "unknown",
      }, "data");
    }).catch(err => {
      serviceLog("bus_emit_error", { error: err instanceof Error ? err.message : "unknown" });
    });
  } catch (err) {
    serviceLog("bus_import_error", { error: err instanceof Error ? err.message : "unknown" });
  }
}

export function stopNewsService(): void {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    serviceLog("stopped");
  }
}

export function startNewsService(intervalMs = REFRESH_MS): () => void {
  if (_refreshTimer) return () => {};
  serviceLog("starting", { intervalMs });
  refreshNewsData();
  _refreshTimer = setInterval(() => {
    if (!document.hidden) {
      const backoffMs = _consecutiveFailures > 0
        ? Math.min(intervalMs * Math.pow(2, _consecutiveFailures - 1), MAX_RETRY_BACKOFF_MS)
        : 0;
      if (backoffMs > 0) {
        serviceLog("backoff_delay", { backoffMs, consecutiveFailures: _consecutiveFailures });
        setTimeout(() => refreshNewsData(), backoffMs);
      } else {
        refreshNewsData();
      }
    }
  }, intervalMs);
  return () => {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  };
}
