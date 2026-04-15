import { useState, useEffect, useCallback, useRef } from "react";
import { db as supabase } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { buildStaticSnapshot } from "@/constants/static-forex-rates";

export interface ForexSnapshot {
  base: string;
  rates: Record<string, number>;
  source: string;
  fetchedAt: string;
  spread: number;
}

const REFRESH_MS = 300_000;

const RATE_CACHE: Record<string, { snapshot: ForexSnapshot; at: number }> = {};

function seedFromEngineCache(): void {
  if (RATE_CACHE["EUR"]) return;
  try {
    import("@/services/data/forex-data-service").then(({ getForexEngineCache }) => {
      if (RATE_CACHE["EUR"]) return;
      const cached = getForexEngineCache();
      if (cached?.rates && Object.keys(cached.rates).length > 0) {
        RATE_CACHE["EUR"] = {
          snapshot: {
            base: cached.base,
            rates: cached.rates,
            source: cached.source + "_engine",
            fetchedAt: new Date(cached.fetchedAt).toISOString(),
            spread: 0,
          },
          at: cached.fetchedAt,
        };
      }
    }).catch(() => {});
  } catch {}
}

seedFromEngineCache();

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function fetchFromFrankfurter(): Promise<ForexSnapshot | null> {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=EUR", {
      signal: createTimeoutSignal(8000),
    });
    if (!r.ok) return null;
    const raw = await r.json();
    return {
      base: raw.base,
      rates: raw.rates as Record<string, number>,
      source: "frankfurter",
      fetchedAt: new Date().toISOString(),
      spread: 0,
    };
  } catch (err) {
    console.warn("[useForexRates] Frankfurter fetch failed:", err);
    return null;
  }
}

async function fetchFromExchangeRateAPI(): Promise<ForexSnapshot | null> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/EUR", {
      signal: createTimeoutSignal(10000),
    });
    if (!r.ok) return null;
    const raw = await r.json();
    if (raw.result !== "success" || !raw.rates) return null;
    const { EUR: _eur, ...otherRates } = raw.rates as Record<string, number>;
    return {
      base: "EUR",
      rates: otherRates,
      source: "exchangerate-api",
      fetchedAt: new Date().toISOString(),
      spread: 0,
    };
  } catch (err) {
    console.warn("[useForexRates] ExchangeRate-API fetch failed:", err);
    return null;
  }
}

async function fetchFromEdgeFunction(): Promise<ForexSnapshot | null> {
  try {
    const { data, error } = await supabase.functions.invoke("fx-rates", {
      body: null,
    });
    if (error || !data?.rates) return null;
    return {
      base: data.base ?? "EUR",
      rates: data.rates as Record<string, number>,
      source: data.source ?? "ecb",
      fetchedAt: data.fetched_at ?? new Date().toISOString(),
      spread: typeof data.spread === "number" ? data.spread : 0.02,
    };
  } catch {
    return null;
  }
}

function getStaticFallbackSnapshot(): ForexSnapshot {
  const built = buildStaticSnapshot();
  return {
    ...built,
    spread: 0,
  };
}

function fillMissingFromStatic(rates: Record<string, number>): Record<string, number> {
  const staticSnap = buildStaticSnapshot();
  const merged = { ...rates };
  for (const [currency, rate] of Object.entries(staticSnap.rates)) {
    if (!(currency in merged)) {
      merged[currency] = rate;
    }
  }
  return merged;
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

async function refreshSnapshot(force = false): Promise<ForexSnapshot> {
  const cached = RATE_CACHE["EUR"];
  if (!force && cached && Date.now() - cached.at < REFRESH_MS) {
    return cached.snapshot;
  }

  let snap = await fetchFromFrankfurter();

  if (!snap) snap = await fetchFromExchangeRateAPI();

  if (!snap) snap = await fetchFromEdgeFunction();

  if (!snap) {
    try {
      const { getForexEngineCache } = await import("@/services/data/forex-data-service");
      const engineCached = getForexEngineCache();
      if (engineCached?.rates && Object.keys(engineCached.rates).length > 0) {
        snap = {
          base: engineCached.base,
          rates: engineCached.rates,
          source: engineCached.source + "_engine",
          fetchedAt: new Date(engineCached.fetchedAt).toISOString(),
          spread: 0,
        };
      }
    } catch {}
  }

  if (!snap) {
    snap = getStaticFallbackSnapshot();
  }

  if (snap.source !== "static") {
    snap = { ...snap, rates: fillMissingFromStatic(snap.rates) };
  }

  RATE_CACHE["EUR"] = { snapshot: snap, at: Date.now() };
  return snap;
}

export function useForexRates() {
  const [snapshot, setSnapshot] = useState<ForexSnapshot | null>(
    () => RATE_CACHE["EUR"]?.snapshot ?? null,
  );
  const [loading, setLoading] = useState(!RATE_CACHE["EUR"]);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const snap = await refreshSnapshot(force);
    setSnapshot(snap);
    if (snap.source === "static") {
      setError("indicative");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(() => refresh(), REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  function getRate(base: string, target: string): number | null {
    if (!snapshot) return null;
    return crossRate(snapshot, base, target);
  }

  const forceRefresh = useCallback(() => refresh(true), [refresh]);

  return { snapshot, loading, error, refresh: forceRefresh, getRate };
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
  } catch {}
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
