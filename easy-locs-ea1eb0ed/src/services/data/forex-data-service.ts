interface CachedRates {
  base: string;
  rates: Record<string, number>;
  source: string;
  fetchedAt: number;
}

let _cachedRates: CachedRates | null = null;
const STALE_MS = 300_000;
let _refreshTimer: ReturnType<typeof setInterval> | null = null;

async function fetchFromFrankfurter(): Promise<Record<string, number> | null> {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=EUR", {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const raw = await r.json();
    return raw.rates as Record<string, number>;
  } catch {
    return null;
  }
}

async function fetchFromEdge(): Promise<Record<string, number> | null> {
  try {
    const { db } = await import("@/services/db");
    const { data, error } = await db.functions.invoke("fx-rates", { body: null });
    if (error || !data?.rates) return null;
    return data.rates as Record<string, number>;
  } catch {
    return null;
  }
}

export function getForexServiceCache(): CachedRates | null {
  return _cachedRates;
}

export { getForexServiceCache as getForexEngineCache };

export async function refreshForexRates(): Promise<CachedRates | null> {
  if (_cachedRates && Date.now() - _cachedRates.fetchedAt < STALE_MS) {
    return _cachedRates;
  }

  let rates = await fetchFromEdge();
  let source = "edge";

  if (!rates) {
    rates = await fetchFromFrankfurter();
    source = "frankfurter";
  }

  if (rates) {
    _cachedRates = { base: "EUR", rates, source, fetchedAt: Date.now() };
    try {
      const { platformBus } = await import("@/lib/shared/platform-bus");
      platformBus.emit("forex.rates.updated", {
        base: "EUR", source, pairCount: Object.keys(rates).length, fetchedAt: _cachedRates.fetchedAt,
      }, "data");
    } catch {}
  }

  return _cachedRates;
}

export function startForexService(intervalMs = 60_000): () => void {
  if (_refreshTimer) return () => {};
  refreshForexRates();
  _refreshTimer = setInterval(() => {
    if (!document.hidden) refreshForexRates();
  }, intervalMs);
  return () => {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  };
}
