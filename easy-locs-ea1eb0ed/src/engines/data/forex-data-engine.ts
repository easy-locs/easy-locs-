import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface CachedRates {
  base: string;
  rates: Record<string, number>;
  source: string;
  fetchedAt: number;
}

let _cachedRates: CachedRates | null = null;
const STALE_MS = 300_000;

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

export function getForexEngineCache(): CachedRates | null {
  return _cachedRates;
}

export class ForexDataEngine extends BaseEngine {
  private fetchCount = 0;

  constructor() {
    super({
      id: "data-forex-rates",
      name: "Forex Data Engine",
      category: "data",
      domain: "wallet",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    if (document.hidden) {
      return { level: "observe", findings: 0, actions: [], duration: 0 };
    }

    if (_cachedRates && Date.now() - _cachedRates.fetchedAt < STALE_MS) {
      return { level: "observe", findings: 0, actions: ["rates_fresh"], duration: 0 };
    }

    const start = Date.now();
    let rates = await fetchFromEdge();
    let source = "edge";

    if (!rates) {
      rates = await fetchFromFrankfurter();
      source = "frankfurter";
    }

    if (rates) {
      _cachedRates = {
        base: "EUR",
        rates,
        source,
        fetchedAt: Date.now(),
      };
      this.fetchCount++;

      try {
        const { platformBus } = await import("@/lib/shared/platform-bus");
        platformBus.emit("forex.rates.updated", {
          base: "EUR",
          source,
          pairCount: Object.keys(rates).length,
          fetchedAt: _cachedRates.fetchedAt,
        }, "data");
      } catch {}

      return {
        level: "act",
        findings: Object.keys(rates).length,
        actions: [`Fetched ${Object.keys(rates).length} rates from ${source}`],
        duration: Date.now() - start,
      };
    }

    return {
      level: "detect",
      findings: 1,
      actions: ["forex_fetch_failed"],
      duration: Date.now() - start,
    };
  }
}
