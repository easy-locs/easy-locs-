/**
 * currency-engine.ts — CANONICAL COUNTRY CURRENCY ENGINE
 * Single source of truth for resolving and formatting currency by country.
 * 
 * Priority: explicit currency > storefront > merchant > country > fallback
 */

/** Comprehensive country → currency map */
const COUNTRY_CURRENCY: Record<string, string> = {
  // Middle East
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR",
  JO: "JOD", LB: "LBP", IQ: "IQD", SY: "SYP", YE: "YER", PS: "ILS",
  // North Africa
  MA: "MAD", TN: "TND", DZ: "DZD", EG: "EGP", LY: "LYD",
  // West Africa (CFA)
  SN: "XOF", CI: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", TG: "XOF", BJ: "XOF", GW: "XOF",
  // Central Africa (CFA)
  CM: "XAF", GA: "XAF", CG: "XAF", TD: "XAF", CF: "XAF", GQ: "XAF",
  // East/South Africa
  NG: "NGN", ZA: "ZAR", KE: "KES", GH: "GHS", TZ: "TZS", UG: "UGX", ET: "ETB", RW: "RWF",
  // Europe
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR", MT: "EUR",
  GB: "GBP", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
  PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN",
  TR: "TRY", UA: "UAH", RS: "RSD",
  // Americas
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS",
  CO: "COP", CL: "CLP", PE: "PEN", UY: "UYU",
  // Asia
  JP: "JPY", CN: "CNY", IN: "INR", KR: "KRW", SG: "SGD",
  MY: "MYR", TH: "THB", VN: "VND", PH: "PHP", ID: "IDR",
  TW: "TWD", HK: "HKD", PK: "PKR", BD: "BDT", LK: "LKR",
  // Oceania
  AU: "AUD", NZ: "NZD",
};

/** Currency → symbol map */
const CURRENCY_SYMBOL: Record<string, string> = {
  AED: "AED", SAR: "SAR", QAR: "QAR", KWD: "KWD", BHD: "BHD", OMR: "OMR",
  EUR: "€", USD: "$", GBP: "£", CHF: "CHF", JPY: "¥", CNY: "¥",
  INR: "₹", BRL: "R$", TRY: "₺", NGN: "₦", KES: "KSh",
  MAD: "MAD", TND: "TND", DZD: "DZD", EGP: "EGP",
  XOF: "CFA", XAF: "CFA",
  SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft", RON: "lei",
  CAD: "CA$", MXN: "MX$", ARS: "AR$", COP: "CO$", CLP: "CL$", PEN: "S/.",
  SGD: "S$", MYR: "RM", THB: "฿", PHP: "₱", IDR: "Rp",
  AUD: "A$", NZD: "NZ$",
  KRW: "₩", TWD: "NT$", HKD: "HK$", PKR: "Rs", BDT: "৳",
};

const DEFAULT_CURRENCY = "AED";

/** Resolve country code to currency */
export function currencyFromCountry(country?: string | null): string {
  if (!country) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[country.toUpperCase().trim()] || DEFAULT_CURRENCY;
}

/** Get symbol for currency code */
export function currencySymbol(currency?: string | null): string {
  if (!currency) return DEFAULT_CURRENCY;
  return CURRENCY_SYMBOL[currency] || currency;
}

/**
 * resolveDisplayCurrency — canonical priority chain.
 * entity.currency > entity.storefront_currency > country > fallback
 */
export function resolveDisplayCurrency(entity: {
  currency?: string | null;
  storefront_currency?: string | null;
  country?: string | null;
}): string {
  return (
    entity.currency ||
    entity.storefront_currency ||
    (entity.country ? currencyFromCountry(entity.country) : null) ||
    DEFAULT_CURRENCY
  );
}

/**
 * formatMoneyByCountry — locale-aware canonical money formatter.
 * Uses Intl.NumberFormat with proper currency code.
 */
export function formatMoneyByCountry(
  amount: number,
  country?: string | null,
  currency?: string | null,
  locale?: string,
): string {
  const cur = currency || currencyFromCountry(country);
  const loc = locale || navigator?.language || "en-US";
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = currencySymbol(cur);
    return `${sym} ${amount.toFixed(2)}`;
  }
}

/**
 * formatEntityPrice — format price for any merchant/listing entity.
 * Reads currency from the entity itself, falling back by country.
 */
export function formatEntityPrice(
  amount: number,
  entity: { currency?: string | null; country?: string | null },
): string {
  const cur = resolveDisplayCurrency(entity);
  return formatMoneyByCountry(amount, null, cur);
}

export { COUNTRY_CURRENCY, CURRENCY_SYMBOL };
