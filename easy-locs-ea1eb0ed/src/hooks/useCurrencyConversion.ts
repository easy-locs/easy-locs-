import { useState, useEffect, useCallback, useRef } from "react";
import { COUNTRY_CURRENCY_MAP } from "@/lib/i18n";
import { appCache } from "@/lib/infrastructure/cache-layer";
import { STATIC_RATES_TO_EUR } from "@/constants/static-forex-rates";

let _liveRates: Record<string, number> | null = null;
let _liveRatesFetchedAt = 0;
const LIVE_RATES_TTL_MS = 300_000;

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  if (_liveRates && Date.now() - _liveRatesFetchedAt < LIVE_RATES_TTL_MS) {
    return _liveRates;
  }

  const cached = appCache.get<Record<string, number>>("fx:live-rates");
  if (cached) {
    _liveRates = cached;
    _liveRatesFetchedAt = Date.now();
    return cached;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

    if (supabaseUrl && anonKey) {
      const resp = await fetch(`${supabaseUrl}/functions/v1/fx-rates`, {
        method: "GET",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.rates) {
          const eurRates: Record<string, number> = { EUR: 1 };
          for (const [currency, rate] of Object.entries(data.rates)) {
            if (typeof rate === "number" && rate > 0) {
              eurRates[currency] = 1 / rate;
            }
          }
          _liveRates = eurRates;
          _liveRatesFetchedAt = Date.now();
          appCache.set("fx:live-rates", eurRates, "fx-rates");
          return eurRates;
        }
      }
    }

    const r = await fetch("https://api.frankfurter.app/latest?from=EUR", {
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const raw = await r.json();
      const eurRates: Record<string, number> = { EUR: 1 };
      for (const [currency, rate] of Object.entries(raw.rates)) {
        if (typeof rate === "number" && rate > 0) {
          eurRates[currency] = 1 / rate;
        }
      }
      _liveRates = eurRates;
      _liveRatesFetchedAt = Date.now();
      appCache.set("fx:live-rates", eurRates, "fx-rates");
      return eurRates;
    }
  } catch {
    // Fall through to null
  }
  return null;
}

export let RATES_TO_EUR: Record<string, number> = { ...STATIC_RATES_TO_EUR };

export const detectCustomerCurrency = (): string => {
  try {
    const locale = navigator.language || "en-US";
    const parts = locale.split("-");
    const region = (parts[1] || parts[0]).toUpperCase();
    return COUNTRY_CURRENCY_MAP[region] || "EUR";
  } catch {
    return "EUR";
  }
};

export const computeExchangeRate = (fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return 1;
  const fromRate = RATES_TO_EUR[fromCurrency] || 1;
  const toRate = RATES_TO_EUR[toCurrency] || 1;
  return Math.round((fromRate / toRate) * 1000000) / 1000000;
};

export const useCurrencyConversion = (userCountry: string = "FR") => {
  const baseCurrency = COUNTRY_CURRENCY_MAP[userCountry] || "EUR";
  const [, setTick] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchLiveRates().then((live) => {
      if (live) {
        RATES_TO_EUR = { ...STATIC_RATES_TO_EUR, ...live };
        setTick((t) => t + 1);
      }
    });
  }, []);

  const convert = useCallback((amount: number, fromCurrency: string, toCurrency?: string) => {
    const target = toCurrency || baseCurrency;
    if (fromCurrency === target) return amount;
    const fromRate = RATES_TO_EUR[fromCurrency] || 1;
    const toRate = RATES_TO_EUR[target] || 1;
    const amountInEur = amount * fromRate;
    return Math.round((amountInEur / toRate) * 100) / 100;
  }, [baseCurrency]);

  const formatCurrency = useCallback((amount: number, currency?: string) => {
    const cur = currency || baseCurrency;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${cur}`;
    }
  }, [baseCurrency]);

  return { baseCurrency, convert, formatCurrency };
};
