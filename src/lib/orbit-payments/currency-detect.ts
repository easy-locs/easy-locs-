/**
 * Orbit Payments — Currency detection with priority cascade
 * 1. Saved user preference (profile.preferred_currency)
 * 2. Account/billing country (profile.country)
 * 3. Device locale
 * 4. Fallback to EUR
 */
import type { DetectedCurrency } from "./types";
import { SUPPORTED_CURRENCIES } from "./types";

/** Map of country codes to likely currencies */
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", JP: "JPY", CN: "CNY",
  CH: "CHF", MA: "MAD", TN: "TND", DZ: "DZD", EG: "EGP", NG: "NGN",
  ZA: "ZAR", BR: "BRL", IN: "INR", TR: "TRY", SA: "SAR", AE: "AED",
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  SN: "XOF", CI: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", TG: "XOF", BJ: "XOF", GW: "XOF",
  CM: "XAF", GA: "XAF", CG: "XAF", TD: "XAF", CF: "XAF", GQ: "XAF",
};

/** Detect currency from browser locale region */
function detectFromLocale(): string {
  try {
    const locale = navigator.language || "en-US";
    const parts = locale.split("-");
    const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
    return COUNTRY_CURRENCY_MAP[region] || "EUR";
  } catch {
    return "EUR";
  }
}

/** Detect currency from country code */
export function detectFromCountry(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase().trim();
  return COUNTRY_CURRENCY_MAP[code] || null;
}

/** Full cascade: preference → country → locale → EUR */
export function detectLocalCurrency(opts?: {
  preferredCurrency?: string | null;
  accountCountry?: string | null;
}): DetectedCurrency {
  // 1. Saved user preference
  if (opts?.preferredCurrency && SUPPORTED_CURRENCIES[opts.preferredCurrency]) {
    const info = SUPPORTED_CURRENCIES[opts.preferredCurrency];
    return { code: opts.preferredCurrency, symbol: info.symbol, name: info.name };
  }

  // 2. Account/billing country
  const fromCountry = detectFromCountry(opts?.accountCountry);
  if (fromCountry && SUPPORTED_CURRENCIES[fromCountry]) {
    const info = SUPPORTED_CURRENCIES[fromCountry];
    return { code: fromCountry, symbol: info.symbol, name: info.name };
  }

  // 3. Device locale
  const fromLocale = detectFromLocale();
  const info = SUPPORTED_CURRENCIES[fromLocale] || SUPPORTED_CURRENCIES.EUR;
  return { code: fromLocale, symbol: info.symbol, name: info.name };
}

/** Format amount with currency symbol */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(navigator.language || "fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const info = SUPPORTED_CURRENCIES[currency];
    return `${info?.symbol || currency} ${amount.toFixed(2)}`;
  }
}

/** Format LOCS amount */
export function formatLocs(amount: number): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LOCS`;
}
