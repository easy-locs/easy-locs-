import { useState, useEffect, useCallback, useRef } from "react";
import { fetchNews } from "@/lib/intelligence/global/news-provider";
import { bootProviders } from "@/lib/intelligence/global/provider-boot";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

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
}

export function useNewsData(country: string = "FR", city?: string): UseNewsDataReturn {
  const [items, setItems] = useState<CanonicalGlobalFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [category, setCategory] = useState<NewsCategory>("all");
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const itemsRef = useRef<CanonicalGlobalFeedItem[]>([]);
  const initialLoadDoneRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const isBackgroundRefresh = initialLoadDoneRef.current;
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);
      bootProviders();
      const result = await fetchNews(country, city);
      if (!mountedRef.current) return;
      if (result.length === 0) {
        await new Promise(r => setTimeout(r, 1500));
        const retryResult = await fetchNews(country, city);
        if (!mountedRef.current) return;
        if (retryResult.length === 0 && itemsRef.current.length === 0) {
          setError("Aucune actualité disponible pour le moment. Le flux se mettra à jour automatiquement.");
        }
        setItems(retryResult);
        itemsRef.current = retryResult;
      } else {
        setItems(result);
        itemsRef.current = result;
      }
      setLastRefreshedAt(new Date());
      initialLoadDoneRef.current = true;
    } catch {
      if (!mountedRef.current) return;
      setError("Impossible de charger les actualités. Veuillez réessayer.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [country, city]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    refreshTimerRef.current = setInterval(refresh, AUTO_REFRESH_MS);

    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [refresh]);

  const filteredItems = category === "all" ? items : items.filter(item => matchesCategory(item, category));

  return { items, filteredItems, loading, error, lastRefreshedAt, category, setCategory, refresh };
}
