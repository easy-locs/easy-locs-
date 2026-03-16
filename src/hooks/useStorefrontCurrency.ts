/**
 * useStorefrontCurrency — Multi-currency support for storefronts.
 * Detects buyer's preferred currency and provides conversion helpers.
 */
import { useState, useCallback, useMemo } from "react";

// Static rates (updated periodically — could be fetched from API)
const RATES: Record<string, number> = {
  EUR: 1, USD: 1.09, GBP: 0.86, CHF: 0.97, CAD: 1.48,
  AED: 4.0, MAD: 10.8, XOF: 655.96, XAF: 655.96,
  JPY: 163, CNY: 7.9, INR: 91, BRL: 5.4, MXN: 18.5,
  TRY: 34, ZAR: 19.2, NGN: 1550, KES: 153,
  AUD: 1.66, NZD: 1.79, SEK: 11.2, NOK: 11.5, DKK: 7.46,
  PLN: 4.3, CZK: 25.2, HUF: 395, RON: 4.97,
  SAR: 4.09, QAR: 3.97, KWD: 0.34, BHD: 0.41,
  SGD: 1.46, HKD: 8.5, THB: 37.5, PHP: 61, MYR: 4.8,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CHF: "CHF", JPY: "¥", CNY: "¥",
  INR: "₹", BRL: "R$", TRY: "₺", NGN: "₦", KES: "KSh",
  AED: "AED", MAD: "MAD", XOF: "CFA", XAF: "CFA",
};

function detectCurrency(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("America/New_York") || tz.startsWith("America/Chicago") || tz.startsWith("America/Los_Angeles") || tz.startsWith("America/Denver")) return "USD";
    if (tz.startsWith("Europe/London")) return "GBP";
    if (tz.startsWith("Europe/Zurich")) return "CHF";
    if (tz.startsWith("Asia/Dubai")) return "AED";
    if (tz.startsWith("Africa/Casablanca")) return "MAD";
    if (tz.startsWith("Asia/Tokyo")) return "JPY";
    if (tz.startsWith("Asia/Shanghai") || tz.startsWith("Asia/Hong_Kong")) return "CNY";
    if (tz.startsWith("Asia/Kolkata")) return "INR";
    // Default to EUR for Europe
    if (tz.startsWith("Europe/")) return "EUR";
  } catch {}
  return "EUR";
}

export const SUPPORTED_CURRENCIES = Object.keys(RATES);

export function useStorefrontCurrency(shopCurrency: string = "EUR") {
  const detectedCurrency = useMemo(() => detectCurrency(), []);
  const [displayCurrency, setDisplayCurrency] = useState(detectedCurrency);

  const convert = useCallback((amount: number, from?: string): number => {
    const src = from || shopCurrency;
    if (src === displayCurrency) return amount;
    const srcRate = RATES[src] || 1;
    const dstRate = RATES[displayCurrency] || 1;
    // Convert to EUR base, then to target
    return (amount / srcRate) * dstRate;
  }, [shopCurrency, displayCurrency]);

  const formatPrice = useCallback((amount: number, from?: string): string => {
    const converted = convert(amount, from);
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency", currency: displayCurrency,
        minimumFractionDigits: 0, maximumFractionDigits: 2,
      }).format(converted);
    } catch {
      return `${converted.toFixed(2)} ${displayCurrency}`;
    }
  }, [convert, displayCurrency]);

  const isConverted = displayCurrency !== shopCurrency;

  return {
    displayCurrency,
    setDisplayCurrency,
    shopCurrency,
    convert,
    formatPrice,
    isConverted,
    detectedCurrency,
    supportedCurrencies: SUPPORTED_CURRENCIES,
  };
}
