import { useState, useEffect, useCallback, useRef } from "react";
import { COUNTRY_CURRENCY_MAP } from "@/lib/i18n";

const STATIC_RATES_TO_EUR: Record<string, number> = {
  EUR: 1, GBP: 1.17, CHF: 1.05, SEK: 0.089, DKK: 0.134, NOK: 0.087,
  PLN: 0.233, CZK: 0.040, HUF: 0.0026, RON: 0.201, BGN: 0.511,
  ISK: 0.0067, RSD: 0.0085, UAH: 0.024, GEL: 0.35, MDL: 0.052,
  ALL: 0.0097, MKD: 0.016, BAM: 0.511, HRK: 0.133,
  USD: 0.92, CAD: 0.68, MXN: 0.054, BRL: 0.175, ARS: 0.0010,
  CLP: 0.0010, COP: 0.00023, PEN: 0.25, UYU: 0.023, BOB: 0.133,
  PYG: 0.00012, DOP: 0.016, CRC: 0.0018, GTQ: 0.12, HNL: 0.037,
  NIO: 0.025, PAB: 0.92, JMD: 0.006, TTD: 0.135, BBD: 0.46,
  BSD: 0.92, BZD: 0.46, GYD: 0.0044, SRD: 0.027, HTG: 0.007,
  VES: 0.025,
  ZAR: 0.051, NGN: 0.00060, KES: 0.0060, GHS: 0.063, MAD: 0.092,
  TND: 0.300, DZD: 0.0068, XOF: 0.00153, XAF: 0.00153, EGP: 0.019,
  ETB: 0.016, TZS: 0.00036, UGX: 0.00024, MGA: 0.00020, MUR: 0.020,
  MWK: 0.00053, ZMW: 0.034, BWP: 0.068, NAD: 0.051, SZL: 0.051,
  LSL: 0.051, SCR: 0.067, GMD: 0.013, CVE: 0.0091, STN: 0.041,
  RWF: 0.00072, BIF: 0.00032, DJF: 0.0052, ERN: 0.061, SOS: 0.0016,
  SDG: 0.0015, LYD: 0.19, AOA: 0.0011, CDF: 0.00033, MZN: 0.014,
  MRU: 0.024,
  AED: 0.250, SAR: 0.245, QAR: 0.253, BHD: 2.44, KWD: 2.99,
  OMR: 2.39, JOD: 1.30, ILS: 0.25, LBP: 0.000010, IQD: 0.00070,
  SYP: 0.00037, YER: 0.0037,
  TRY: 0.028,
  JPY: 0.0062, CNY: 0.127, INR: 0.011, KRW: 0.00069, SGD: 0.69,
  MYR: 0.21, THB: 0.026, VND: 0.000037, PHP: 0.016, IDR: 0.000058,
  TWD: 0.029, HKD: 0.118, BDT: 0.0076, PKR: 0.0033, LKR: 0.0030,
  NPR: 0.0069, MMK: 0.00044, KHR: 0.00023, LAK: 0.000043, BND: 0.69,
  MNT: 0.00027, KZT: 0.0019, UZS: 0.000073, AZN: 0.54, AMD: 0.0024,
  KGS: 0.010, TJS: 0.084, TMT: 0.26, AFN: 0.013, MVR: 0.060,
  AUD: 0.61, NZD: 0.56, FJD: 0.41, PGK: 0.23, WST: 0.34, TOP: 0.39,
  VUV: 0.0078, SBD: 0.11, XPF: 0.0084,
  CUP: 0.038, AWG: 0.51, ANG: 0.51, KYD: 1.12, BMD: 0.92,
  XCD: 0.34,
};

let _liveRates: Record<string, number> | null = null;
let _liveRatesFetchedAt = 0;
const LIVE_RATES_TTL_MS = 300_000;

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  if (_liveRates && Date.now() - _liveRatesFetchedAt < LIVE_RATES_TTL_MS) {
    return _liveRates;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

    if (supabaseUrl && anonKey) {
      const resp = await fetch(`${supabaseUrl}/functions/v1/fx-rates`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: "null",
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
