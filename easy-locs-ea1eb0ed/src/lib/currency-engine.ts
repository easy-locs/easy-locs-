/**
 * currency-engine.ts — CANONICAL COUNTRY CURRENCY ENGINE
 * Single source of truth for resolving and formatting currency by country.
 * 
 * Priority: explicit currency > storefront > merchant > country > fallback
 * 
 * Auto-derives from the complete 250-entry ISO 3166-1 dataset (countries.ts)
 * to guarantee ZERO missing countries. Manual overrides below take precedence.
 */

import { COUNTRIES } from "@/lib/data/countries";

const COUNTRY_CURRENCY_AUTO: Record<string, string> = {};
for (const c of COUNTRIES) {
  COUNTRY_CURRENCY_AUTO[c.code] = c.currency;
}

const COUNTRY_CURRENCY: Record<string, string> = {
  ...COUNTRY_CURRENCY_AUTO,
};

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
  RUB: "₽", UAH: "₴", ILS: "₪", BGN: "лв", RSD: "din",
  GEL: "₾", AMD: "֏", AZN: "₼", KZT: "₸", UZS: "сўм",
  AFN: "؋", IRR: "﷼", IQD: "ع.د", JOD: "JD", LBP: "L£", SYP: "LS", YER: "﷼",
  LYD: "LD", SDG: "SDG", SSP: "SSP", SOS: "Sh", DJF: "Fdj", ERN: "Nfk",
  ETB: "Br", RWF: "FRw", TZS: "TSh", UGX: "USh", GHS: "GH₵", ZAR: "R",
  NAD: "N$", BWP: "P", ZMW: "ZK", ZWL: "Z$", MWK: "MK", LSL: "L", SZL: "E",
  MZN: "MT", AOA: "Kz", CVE: "CVE", STN: "Db", KMF: "CF", SCR: "₨", MUR: "₨",
  GMD: "D", LRD: "L$", SLE: "Le", GNF: "FG", MRU: "UM", BIF: "FBu",
  MGA: "Ar", MDL: "L", MKD: "ден", ALL: "L", BAM: "KM",
  ISK: "kr", GIP: "£",
  CRC: "₡", HNL: "L", NIO: "C$", GTQ: "Q", DOP: "RD$", CUP: "₱",
  PAB: "B/.", PYG: "₲", BOB: "Bs", VES: "Bs.S",
  JMD: "J$", TTD: "TT$", XCD: "EC$", BBD: "Bds$", BSD: "B$",
  BZD: "BZ$", GYD: "G$", SRD: "SRD", HTG: "G", AWG: "ƒ", ANG: "ƒ",
  KYD: "CI$", BMD: "BD$",
  BND: "B$", KHR: "៛", LAK: "₭", MMK: "K", MNT: "₮", MOP: "MOP$",
  NPR: "Rs", FJD: "FJ$", PGK: "K", WST: "T", TOP: "T$", VUV: "VT",
  SBD: "SI$", XPF: "F",
  KGS: "сом", TJS: "SM", TMT: "m", MVR: "Rf",
  BTN: "Nu", BYN: "Br", KPW: "₩",
  FKP: "£", SHP: "£",
  LKR: "Rs",
  VND: "₫",
};

const DEFAULT_CURRENCY = "AED";

export function currencyFromCountry(country?: string | null): string {
  if (!country) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[country.toUpperCase().trim()] || DEFAULT_CURRENCY;
}

export function currencySymbol(currency?: string | null): string {
  if (!currency) return DEFAULT_CURRENCY;
  return CURRENCY_SYMBOL[currency] || currency;
}

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

export function formatEntityPrice(
  amount: number,
  entity: { currency?: string | null; country?: string | null },
): string {
  const cur = resolveDisplayCurrency(entity);
  return formatMoneyByCountry(amount, null, cur);
}

export { COUNTRY_CURRENCY, CURRENCY_SYMBOL };
