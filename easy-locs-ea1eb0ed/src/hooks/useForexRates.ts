/**
 * useForexRates — Live exchange rates.
 * Primary: fx-rates edge function (ECB + Fixer, with platform spread).
 * Fallback: Frankfurter API (ECB proxy, no spread).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { db as supabase } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";

export interface ForexSnapshot {
  base: string;
  rates: Record<string, number>;
  source: string;
  fetchedAt: string;
  spread: number;
}

const REFRESH_MS = 300_000;

// In-memory cache keyed by "EUR" (edge function always returns EUR-based rates)
const RATE_CACHE: Record<string, { snapshot: ForexSnapshot; at: number }> = {};

/** Fetch from the fx-rates edge function (ECB / Fixer backed, DB-cached 1h). */
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

/** Fallback: fetch directly from Frankfurter (ECB proxy, no spread). */
async function fetchFromFrankfurter(): Promise<ForexSnapshot | null> {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=EUR", {
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const raw = await r.json();
    return {
      base: raw.base,
      rates: raw.rates as Record<string, number>,
      source: "frankfurter_fallback",
      fetchedAt: new Date().toISOString(),
      spread: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Cross-rate: given a EUR-based snapshot, derive rate from `base` to `target`.
 * Edge function returns EUR = 1 rates; Frankfurter fallback does too (from=EUR).
 */
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

/**
 * Refresh the EUR-based snapshot.
 * @param force  When true, bypasses in-memory cache and fetches fresh data.
 */
async function refreshSnapshot(force = false): Promise<ForexSnapshot | null> {
  const cached = RATE_CACHE["EUR"];
  if (!force && cached && Date.now() - cached.at < REFRESH_MS) {
    return cached.snapshot;
  }

  let snap = await fetchFromEdgeFunction();
  if (!snap) snap = await fetchFromFrankfurter();
  if (snap) {
    RATE_CACHE["EUR"] = { snapshot: snap, at: Date.now() };
  }
  return snap;
}

// ── Main hook ────────────────────────────────────────────────────────────────

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
    if (snap) {
      setSnapshot(snap);
    } else {
      setError("Impossible de charger les taux. Données en cache utilisées.");
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

  /** Force a network fetch, bypassing the 5-min in-memory cache. */
  const forceRefresh = useCallback(() => refresh(true), [refresh]);

  return { snapshot, loading, error, refresh: forceRefresh, getRate };
}

// ── Favorites (user-scoped) ───────────────────────────────────────────────────

const LEGACY_FAVORITES_KEY = "forex_favorites_v1";

function favoritesKey(userId: string | null | undefined): string {
  return userId ? `forex_favorites_v1:${userId}` : LEGACY_FAVORITES_KEY;
}

function loadFavorites(userId: string | null | undefined): string[] {
  try {
    const key = favoritesKey(userId);
    // Migrate from legacy key if first use as authenticated user
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

  // Re-load when userId changes (login / logout)
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

// ── Static data ───────────────────────────────────────────────────────────────

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
