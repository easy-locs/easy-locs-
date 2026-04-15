import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildStaticSnapshot } from "@/constants/static-forex-rates";

export interface ForexSnapshot {
  base: string;
  rates: Record<string, number>;
  source: string;
  fetchedAt: string;
  spread: number;
}

let _serviceModule: typeof import("@/services/data/forex-data-service") | null = null;
const _serviceModulePromise = import("@/services/data/forex-data-service").then(m => {
  _serviceModule = m;
  return m;
}).catch(err => {
  console.warn("[useForexRates] Failed to load forex-data-service:", err);
  return null;
});

function readFromServiceCache(): ForexSnapshot | null {
  try {
    const cached = _serviceModule?.getForexServiceCache();
    if (cached?.rates && Object.keys(cached.rates).length > 0) {
      return {
        base: cached.base,
        rates: cached.rates,
        source: cached.source,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
        spread: 0,
      };
    }
  } catch (err) {
    console.warn("[useForexRates] Failed to read service cache:", err);
  }
  return null;
}

function getStaticFallbackSnapshot(): ForexSnapshot {
  const built = buildStaticSnapshot();
  return {
    ...built,
    spread: 0,
  };
}

function crossRate(
  eurSnapshot: ForexSnapshot,
  base: string,
  target: string,
): number | null {
  if (base === target) return 1;
  const rates = eurSnapshot.rates;
  if (base === "EUR") return rates[target] ?? null;
  if (target === "EUR") {
    const r = rates[base];
    return r ? 1 / r : null;
  }
  const baseInEur = rates[base];
  const targetInEur = rates[target];
  if (!baseInEur || !targetInEur) return null;
  return targetInEur / baseInEur;
}

const FOREX_REFRESH_INTERVAL_MS = 60_000;

export function useForexRates() {
  const [snapshot, setSnapshot] = useState<ForexSnapshot | null>(() => readFromServiceCache());
  const [loading, setLoading] = useState(!snapshot);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let active = true;
    let busUnsub: (() => void) | null = null;

    const updateFromCache = () => {
      const cached = readFromServiceCache();
      if (cached && active) {
        setSnapshot(cached);
        setLoading(false);
        const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
        setIsStale(cached.source === "static" || cacheAge > FOREX_REFRESH_INTERVAL_MS * 2);
        setError(cached.source === "static" ? "indicative" : null);
      }
    };

    _serviceModulePromise.then(mod => {
      if (!active || !mod) return;
      updateFromCache();

      if (!snapshot && !readFromServiceCache()) {
        mod.refreshForexRates().then(() => {
          if (active) updateFromCache();
        }).catch(err => {
          console.warn("[useForexRates] Initial refresh failed, using static fallback:", err);
          if (active) {
            const fallback = getStaticFallbackSnapshot();
            setSnapshot(fallback);
            setError("indicative");
            setIsStale(true);
            setLoading(false);
          }
        });
      }
    });

    import("@/lib/shared/platform-bus").then(({ platformBus }) => {
      if (!active) return;
      const unsub1 = platformBus.on("forex:rates:updated", () => {
        updateFromCache();
      });
      const unsub2 = platformBus.on("forex.rates.updated", () => {
        updateFromCache();
      });
      busUnsub = () => { unsub1(); unsub2(); };
    }).catch(err => {
      console.warn("[useForexRates] Failed to subscribe to bus:", err);
    });

    const staleCheckInterval = setInterval(() => {
      if (!active) return;
      const cached = readFromServiceCache();
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
        setIsStale(cached.source === "static" || cacheAge > FOREX_REFRESH_INTERVAL_MS * 2);
      }
    }, 30_000);

    return () => {
      active = false;
      if (busUnsub) busUnsub();
      clearInterval(staleCheckInterval);
    };
  }, []);

  function getRate(base: string, target: string): number | null {
    if (!snapshot) return null;
    return crossRate(snapshot, base, target);
  }

  const forceRefresh = useCallback(() => {
    setLoading(true);
    import("@/services/data/forex-data-service").then(({ refreshForexRates }) => {
      return refreshForexRates();
    }).then(() => {
      const cached = readFromServiceCache();
      if (cached) {
        setSnapshot(cached);
        setError(cached.source === "static" ? "indicative" : null);
      }
      setLoading(false);
    }).catch(err => {
      console.warn("[useForexRates] Force refresh failed:", err);
      setLoading(false);
    });
  }, []);

  return { snapshot, loading, error, refresh: forceRefresh, getRate, isStale };
}

const LEGACY_FAVORITES_KEY = "forex_favorites_v1";

function favoritesKey(userId: string | null | undefined): string {
  return userId ? `forex_favorites_v1:${userId}` : LEGACY_FAVORITES_KEY;
}

function loadFavorites(userId: string | null | undefined): string[] {
  try {
    const key = favoritesKey(userId);
    if (userId) {
      const legacy = localStorage.getItem(LEGACY_FAVORITES_KEY);
      if (legacy && !localStorage.getItem(key)) {
        localStorage.setItem(key, legacy);
      }
    }
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(userId: string | null | undefined, favs: string[]) {
  try {
    localStorage.setItem(favoritesKey(userId), JSON.stringify(favs));
  } catch (err) {
    console.warn("[useForexRates] Failed to save favorites to localStorage:", err);
  }
}

export function useForexFavorites() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFavorites(userId),
  );

  useEffect(() => {
    setFavorites(loadFavorites(userId));
  }, [userId]);

  function toggleFavorite(pairKey: string) {
    setFavorites((prev) => {
      const next = prev.includes(pairKey)
        ? prev.filter((f) => f !== pairKey)
        : [...prev, pairKey];
      saveFavorites(userId, next);
      return next;
    });
  }

  function isFavorite(pairKey: string) {
    return favorites.includes(pairKey);
  }

  return { favorites, toggleFavorite, isFavorite };
}

export const MAJOR_PAIRS: Array<{ base: string; target: string }> = [
  { base: "EUR", target: "USD" },
  { base: "EUR", target: "GBP" },
  { base: "EUR", target: "MAD" },
  { base: "USD", target: "AED" },
  { base: "USD", target: "SAR" },
  { base: "USD", target: "EGP" },
  { base: "GBP", target: "USD" },
  { base: "USD", target: "MAD" },
];

export const COUNTRY_SUGGESTED_PAIRS: Record<
  string,
  Array<{ base: string; target: string }>
> = {
  AE: [
    { base: "USD", target: "AED" },
    { base: "EUR", target: "AED" },
    { base: "GBP", target: "AED" },
  ],
  MA: [
    { base: "EUR", target: "MAD" },
    { base: "USD", target: "MAD" },
    { base: "GBP", target: "MAD" },
  ],
  EG: [
    { base: "USD", target: "EGP" },
    { base: "EUR", target: "EGP" },
    { base: "GBP", target: "EGP" },
  ],
  SA: [
    { base: "USD", target: "SAR" },
    { base: "EUR", target: "SAR" },
    { base: "GBP", target: "SAR" },
  ],
  FR: [
    { base: "EUR", target: "USD" },
    { base: "EUR", target: "GBP" },
    { base: "EUR", target: "MAD" },
  ],
  GB: [
    { base: "GBP", target: "USD" },
    { base: "GBP", target: "EUR" },
    { base: "GBP", target: "AED" },
  ],
  US: [
    { base: "USD", target: "EUR" },
    { base: "USD", target: "GBP" },
    { base: "USD", target: "AED" },
  ],
};
