/**
 * Country-aware currency resolution for Easy-Locs.
 * Single source of truth for country→currency mapping.
 */
import { db } from "@/services/db";

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

/** Format a price with its currency symbol. */
export function formatPrice(amount: number, currency?: string | null): string {
  const cur = currency || DEFAULT_CURRENCY;
  const sym = getCurrencySymbol(cur);
  return `${amount.toFixed(2)} ${sym}`;
}

/** Canonical formatMoney — re-exported from lib/format for consistency */
export { formatMoney } from "@/lib/format";

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

/** Resolve currency from a merchant profile (async DB lookup). */
export async function resolveMerchantCurrency(merchantProfileId: string): Promise<string> {
  const { data } = await db
    .from("merchant_onboarding_profiles")
    .select("currency, country")
    .eq("id", merchantProfileId)
    .maybeSingle();
  if (data?.currency) return data.currency;
  if (data?.country) return getCurrencyFromCountry(data.country);
  return DEFAULT_CURRENCY;
}

/** Resolve currency from an existing order (async DB lookup). */
export async function resolveOrderCurrency(orderId: string): Promise<string> {
  const { data } = await db
    .from("orders")
    .select("currency")
    .eq("id", orderId)
    .maybeSingle();
  return data?.currency || DEFAULT_CURRENCY;
}
