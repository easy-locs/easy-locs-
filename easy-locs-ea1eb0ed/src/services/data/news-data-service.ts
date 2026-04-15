import { fetchNews } from "@/lib/intelligence/global/news-provider";
import { bootProviders } from "@/lib/intelligence/global/provider-boot";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

interface CachedNewsData {
  items: CanonicalGlobalFeedItem[];
  country: string;
  city: string | undefined;
  fetchedAt: number;
  source: string;
}

let _cachedNews: CachedNewsData | null = null;
let _refreshTimer: ReturnType<typeof setInterval> | null = null;
let _country = "FR";
let _city: string | undefined;
let _consecutiveFailures = 0;

const REFRESH_MS = 300_000;
const MAX_RETRY_BACKOFF_MS = 60_000;

export function getNewsServiceCache(): CachedNewsData | null {
  return _cachedNews;
}

export function setNewsServiceLocation(country: string, city?: string): void {
  const changed = country !== _country || city !== _city;
  _country = country;
  _city = city;
  if (changed && _refreshTimer) {
    refreshNewsData();
  }
}

export async function refreshNewsData(): Promise<CachedNewsData | null> {
  try {
    bootProviders();
    const items = await fetchNews(_country, _city);

    if (items.length === 0 && _consecutiveFailures < 2) {
      await new Promise(r => setTimeout(r, 1500));
      const retryItems = await fetchNews(_country, _city);
      if (retryItems.length > 0) {
        const isFromCache = _cachedNews && retryItems.length === _cachedNews.items.length &&
          retryItems[0]?.id === _cachedNews.items[0]?.id;
        _cachedNews = {
          items: retryItems,
          country: _country,
          city: _city,
          fetchedAt: isFromCache ? (_cachedNews?.fetchedAt ?? Date.now()) : Date.now(),
          source: isFromCache ? "stale" : "live",
        };
        _consecutiveFailures = 0;
        emitUpdate();
        return _cachedNews;
      }
    }

    if (items.length > 0) {
      const isFromCache = _cachedNews && items.length === _cachedNews.items.length &&
        items[0]?.id === _cachedNews.items[0]?.id;
      _cachedNews = {
        items,
        country: _country,
        city: _city,
        fetchedAt: isFromCache ? (_cachedNews?.fetchedAt ?? Date.now()) : Date.now(),
        source: isFromCache ? "stale" : "live",
      };
      _consecutiveFailures = 0;
    } else {
      _consecutiveFailures++;
      console.warn(`[news-service] No items returned (failure #${_consecutiveFailures})`);
    }

    emitUpdate();
    return _cachedNews;
  } catch (err) {
    _consecutiveFailures++;
    console.warn(`[news-service] Refresh failed (failure #${_consecutiveFailures}):`, err);
    return _cachedNews;
  }
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
      console.warn("[news-service] Failed to emit bus event:", err);
    });
  } catch (err) {
    console.warn("[news-service] Bus import failed:", err);
  }
}

export function stopNewsService(): void {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    console.log("[news-service] Stopped");
  }
}

export function startNewsService(intervalMs = REFRESH_MS): () => void {
  if (_refreshTimer) return () => {};
  console.log("[news-service] Starting background news polling");
  refreshNewsData();
  _refreshTimer = setInterval(() => {
    if (!document.hidden) {
      const backoffMs = _consecutiveFailures > 0
        ? Math.min(intervalMs * Math.pow(2, _consecutiveFailures - 1), MAX_RETRY_BACKOFF_MS)
        : 0;
      if (backoffMs > 0) {
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
