/**
 * Country-aware currency resolution for Easy-Locs.
 * Single source of truth for country→currency mapping.
 */

export interface CountryConfig {
  currency: string;
  symbol: string;
  locale: string;
}

export const COUNTRY_CONFIG: Record<string, CountryConfig> = {
  AE: { currency: "AED", symbol: "AED", locale: "ar-AE" },
  FR: { currency: "EUR", symbol: "€", locale: "fr-FR" },
  MA: { currency: "MAD", symbol: "MAD", locale: "fr-MA" },
  TH: { currency: "THB", symbol: "฿", locale: "th-TH" },
  US: { currency: "USD", symbol: "$", locale: "en-US" },
  GB: { currency: "GBP", symbol: "£", locale: "en-GB" },
  SA: { currency: "SAR", symbol: "SAR", locale: "ar-SA" },
  SN: { currency: "XOF", symbol: "CFA", locale: "fr-SN" },
  TN: { currency: "TND", symbol: "TND", locale: "fr-TN" },
  TR: { currency: "TRY", symbol: "₺", locale: "tr-TR" },
};

const DEFAULT_COUNTRY = "AE";
const DEFAULT_CURRENCY = "AED";

/** Resolve currency from country code. Falls back to AED. */
export function getCurrencyFromCountry(countryCode?: string | null): string {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_CONFIG[countryCode.toUpperCase()]?.currency ?? DEFAULT_CURRENCY;
}

/** Resolve currency symbol from currency code. */
export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return DEFAULT_CURRENCY;
  const entry = Object.values(COUNTRY_CONFIG).find(c => c.currency === currency);
  return entry?.symbol ?? currency;
}

/** Format a price with its currency. */
export function formatPrice(amount: number, currency?: string | null): string {
  const cur = currency || DEFAULT_CURRENCY;
  const sym = getCurrencySymbol(cur);
  return `${amount.toFixed(2)} ${sym}`;
}

/** Format using Intl for locale-aware display. */
export function formatPriceIntl(amount: number, currency?: string | null, locale?: string): string {
  const cur = currency || DEFAULT_CURRENCY;
  const loc = locale || "en-US";
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency: cur }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

/**
 * Resolve the effective currency for a transaction.
 * Priority: explicit currency > storefront > merchant profile > country > default.
 */
export function resolveTransactionCurrency(params: {
  explicitCurrency?: string | null;
  storefrontCurrency?: string | null;
  merchantCurrency?: string | null;
  countryCode?: string | null;
}): string {
  return (
    params.explicitCurrency ||
    params.storefrontCurrency ||
    params.merchantCurrency ||
    getCurrencyFromCountry(params.countryCode) ||
    DEFAULT_CURRENCY
  );
}
