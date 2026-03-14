/**
 * Orbit Payments — Currency detection from browser locale
 */
import type { DetectedCurrency } from "./types";
import { SUPPORTED_CURRENCIES } from "./types";

/** Map of locale regions to likely currencies */
const REGION_CURRENCY_MAP: Record<string, string> = {
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", JP: "JPY", CN: "CNY",
  CH: "CHF", MA: "MAD", TN: "TND", DZ: "DZD", EG: "EGP", NG: "NGN",
  ZA: "ZAR", BR: "BRL", IN: "INR", TR: "TRY", SA: "SAR", AE: "AED",
  // Eurozone
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  // CFA zones
  SN: "XOF", CI: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", TG: "XOF", BJ: "XOF", GW: "XOF",
  CM: "XAF", GA: "XAF", CG: "XAF", TD: "XAF", CF: "XAF", GQ: "XAF",
};

/** Detect the user's local currency from browser settings */
export function detectLocalCurrency(): DetectedCurrency {
  try {
    const locale = navigator.language || "en-US";
    const parts = locale.split("-");
    const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";

    const currencyCode = REGION_CURRENCY_MAP[region] || "EUR";
    const info = SUPPORTED_CURRENCIES[currencyCode];

    return {
      code: currencyCode,
      symbol: info?.symbol || currencyCode,
      name: info?.name || currencyCode,
    };
  } catch {
    return { code: "EUR", symbol: "€", name: "Euro" };
  }
}

/** Format amount with currency symbol */
export function formatCurrency(amount: number, currency: string): string {
  const info = SUPPORTED_CURRENCIES[currency];
  const symbol = info?.symbol || currency;

  try {
    return new Intl.NumberFormat(navigator.language || "fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${symbol} ${amount.toFixed(2)}`;
  }
}

/** Format LOCS amount */
export function formatLocs(amount: number): string {
  return `${amount.toFixed(2)} LOCS`;
}
