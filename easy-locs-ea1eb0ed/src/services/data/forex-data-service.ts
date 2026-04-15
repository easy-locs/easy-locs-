import { buildStaticSnapshot } from "@/constants/static-forex-rates";

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

async function fetchFromExchangeRateAPI(): Promise<Record<string, number> | null> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/EUR", {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const raw = await r.json();
    if (raw.result !== "success" || !raw.rates) return null;
    const { EUR: _eur, ...otherRates } = raw.rates as Record<string, number>;
    return otherRates;
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

function getStaticRates(): Record<string, number> {
  const built = buildStaticSnapshot();
  return built.rates;
}

function fillMissingFromStatic(rates: Record<string, number>): Record<string, number> {
  const staticRates = getStaticRates();
  const merged = { ...rates };
  for (const [currency, rate] of Object.entries(staticRates)) {
    if (!(currency in merged)) {
      merged[currency] = rate;
    }
  }
  return merged;
}

export function getForexServiceCache(): CachedRates | null {
  return _cachedRates;
}

export { getForexServiceCache as getForexEngineCache };

export async function refreshForexRates(force = false): Promise<CachedRates> {
  if (!force && _cachedRates && Date.now() - _cachedRates.fetchedAt < STALE_MS) {
    return _cachedRates;
  }

  let rates = await fetchFromEdge();
  let source = "edge";

  if (!rates) {
    rates = await fetchFromFrankfurter();
    source = "frankfurter";
  }

  if (!rates) {
    rates = await fetchFromExchangeRateAPI();
    source = "exchangerate-api";
  }

  if (!rates) {
    rates = getStaticRates();
    source = "static";
  }

  if (source !== "static") {
    rates = fillMissingFromStatic(rates);
  }

  _cachedRates = { base: "EUR", rates, source, fetchedAt: Date.now() };

  try {
    const { platformBus } = await import("@/lib/shared/platform-bus");
    platformBus.emit("forex.rates.updated", {
      base: "EUR", source, pairCount: Object.keys(rates).length, fetchedAt: _cachedRates.fetchedAt,
    }, "data");
  } catch (err) {
    console.warn("[forex-service] Failed to emit bus event:", err);
  }

  return _cachedRates;
}

export function stopForexService(): void {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    console.log("[forex-service] Stopped");
  }
}

export function startForexService(intervalMs = 60_000): () => void {
  if (_refreshTimer) return () => {};
  refreshForexRates(true);
  _refreshTimer = setInterval(() => {
    if (!document.hidden) refreshForexRates(true);
  }, intervalMs);
  return () => {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  };
}
