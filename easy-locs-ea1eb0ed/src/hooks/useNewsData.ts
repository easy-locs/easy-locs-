import { useState, useEffect, useCallback, useRef } from "react";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const INITIAL_LOAD_TIMEOUT_MS = 5_500;

export type NewsCategory = "all" | "immobilier" | "finance" | "economie" | "local";

const CATEGORY_KEYWORDS: Record<Exclude<NewsCategory, "all">, string[]> = {
  immobilier: ["immobilier", "logement", "appartement", "maison", "loyer", "location", "propriété", "real estate", "housing", "property", "rent", "mortgage", "hypothèque", "dpe", "construction", "résidentiel", "copropriété"],
  finance: ["finance", "banque", "taux", "bourse", "investissement", "crédit", "épargne", "action", "obligation", "bank", "rate", "stock", "investment", "market", "trading", "crypto", "bitcoin", "fintech"],
  economie: ["économie", "pib", "croissance", "inflation", "emploi", "chômage", "commerce", "export", "import", "economy", "gdp", "growth", "unemployment", "trade", "fiscal", "budget", "dette"],
  local: ["local", "ville", "commune", "mairie", "quartier", "région", "municipal", "city", "urban", "communauté", "métropole", "aménagement"],
};

function matchesCategory(item: CanonicalGlobalFeedItem, category: NewsCategory): boolean {
  if (category === "all") return true;
  const keywords = CATEGORY_KEYWORDS[category];
  const text = `${item.title} ${item.summary}`.toLowerCase();
  return keywords.some(kw => text.includes(kw));
}

export interface UseNewsDataReturn {
  items: CanonicalGlobalFeedItem[];
  filteredItems: CanonicalGlobalFeedItem[];
  loading: boolean;
  error: string | null;
  lastRefreshedAt: Date | null;
  category: NewsCategory;
  setCategory: (cat: NewsCategory) => void;
  refresh: () => Promise<void>;
  forceRetry: () => Promise<void>;
  isStale: boolean;
  source: string;
}

let _newsModule: typeof import("@/services/data/news-data-service") | null = null;
const _newsModulePromise = import("@/services/data/news-data-service").then(m => {
  _newsModule = m;
  return m;
}).catch(err => {
  console.warn("[useNewsData] Failed to load news-data-service:", err);
  return null;
});

function readFromServiceCache(): { items: CanonicalGlobalFeedItem[]; fetchedAt: number; source: string } | null {
  try {
    const cached = _newsModule?.getNewsServiceCache();
    if (cached?.items && cached.items.length > 0) {
      return { items: cached.items, fetchedAt: cached.fetchedAt, source: cached.source };
    }
  } catch (err) {
    console.warn("[useNewsData] Failed to read service cache:", err);
  }
  return null;
}

export function useNewsData(country: string = "FR", city?: string): UseNewsDataReturn {
  const [items, setItems] = useState<CanonicalGlobalFeedItem[]>(() => {
    const cached = readFromServiceCache();
    return cached?.items ?? [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = readFromServiceCache();
    return !cached || cached.items.length === 0;
  });
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => {
    const cached = readFromServiceCache();
    return cached ? new Date(cached.fetchedAt) : null;
  });
  const [category, setCategory] = useState<NewsCategory>("all");
  const [isStale, setIsStale] = useState(false);
  const [source, setSource] = useState<string>(() => {
    const cached = readFromServiceCache();
    return cached?.source ?? "unknown";
  });
  const mountedRef = useRef(true);

  const updateFromCache = useCallback(() => {
    const cached = readFromServiceCache();
    if (cached && mountedRef.current) {
      setItems(cached.items);
      setLastRefreshedAt(new Date(cached.fetchedAt));
      setSource(cached.source);
      setLoading(false);
      setError(null);
      const age = Date.now() - cached.fetchedAt;
      setIsStale(age > AUTO_REFRESH_MS * 2);
      console.log(`[useNewsData][${new Date().toISOString()}] render_update`, { itemCount: cached.items.length, source: cached.source, ageMs: age });
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const mod = await _newsModulePromise;
      if (!mod || !mountedRef.current) return;
      mod.setNewsServiceLocation(country, city);
      await mod.refreshNewsData();
      if (!mountedRef.current) return;
      updateFromCache();
    } catch {
      if (!mountedRef.current) return;
      setError("Impossible de charger les actualités. Veuillez réessayer.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [country, city, updateFromCache]);

  const forceRetry = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const mod = await _newsModulePromise;
      if (!mod || !mountedRef.current) return;
      mod.resetNewsResilience();
      mod.setNewsServiceLocation(country, city);
      await mod.refreshNewsData(true);
      if (!mountedRef.current) return;
      updateFromCache();
    } catch {
      if (!mountedRef.current) return;
      setError("Impossible de charger les actualités. Veuillez réessayer.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [country, city, updateFromCache]);

  useEffect(() => {
    mountedRef.current = true;
    let busUnsub: (() => void) | null = null;
    let initialLoadTimer: ReturnType<typeof setTimeout> | null = null;

    _newsModulePromise.then(mod => {
      if (!mountedRef.current || !mod) return;
      mod.setNewsServiceLocation(country, city);

      const cached = readFromServiceCache();
      if (cached && cached.items.length > 0) {
        setItems(cached.items);
        setLastRefreshedAt(new Date(cached.fetchedAt));
        setSource(cached.source);
        setLoading(false);

        const age = Date.now() - cached.fetchedAt;
        if (age > AUTO_REFRESH_MS) {
          refresh();
        }
      } else {
        refresh();

        initialLoadTimer = setTimeout(() => {
          if (!mountedRef.current) return;
          const current = readFromServiceCache();
          if (!current || current.items.length === 0) {
            console.log("[useNewsData] Initial load timeout — forcing cache update check");
            updateFromCache();
          }
        }, INITIAL_LOAD_TIMEOUT_MS);
      }
    });

    import("@/lib/shared/platform-bus").then(({ platformBus }) => {
      if (!mountedRef.current) return;
      busUnsub = platformBus.on("news:data:updated", () => {
        updateFromCache();
      });
    }).catch(err => {
      console.warn("[useNewsData] Failed to subscribe to bus:", err);
    });

    const staleCheckInterval = setInterval(() => {
      if (!mountedRef.current) return;
      const cached = readFromServiceCache();
      if (cached) {
        const age = Date.now() - cached.fetchedAt;
        setIsStale(age > AUTO_REFRESH_MS * 2);
      }
    }, 30_000);

    return () => {
      mountedRef.current = false;
      if (busUnsub) busUnsub();
      if (initialLoadTimer) clearTimeout(initialLoadTimer);
      clearInterval(staleCheckInterval);
    };
  }, [country, city, refresh, updateFromCache]);

  const filteredItems = category === "all" ? items : items.filter(item => matchesCategory(item, category));

  return { items, filteredItems, loading, error, lastRefreshedAt, category, setCategory, refresh, forceRetry, isStale, source };
}
