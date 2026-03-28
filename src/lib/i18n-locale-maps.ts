/**
 * i18n-locale-maps — Atomic: country → locale, country → currency mappings.
 * Extracted from i18n.tsx to reduce its size and separate data from logic.
 */
import type { Locale } from "./i18n";

export const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr", SN: "fr", CI: "fr", MA: "fr", TN: "fr",
  DZ: "fr", CM: "fr", GA: "fr", CG: "fr", CD: "fr", MG: "fr", MU: "fr", LB: "fr",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  DE: "de", AT: "de",
  IT: "it",
  PT: "pt", BR: "pt",
  NL: "nl",
  PL: "pl",
  TR: "tr",
  JP: "ja",
  KR: "ko", CN: "zh",
  IN: "hi", TH: "th", VN: "vi", ID: "id", MY: "ms",
  SE: "sv", DK: "da", NO: "nb", FI: "fi",
  GR: "el", CZ: "cs", HU: "hu", RO: "ro", HR: "hr", BG: "bg", SK: "sk",
  IL: "he", UA: "uk",
  US: "en", GB: "en", IE: "en", AU: "en", NZ: "en", CA: "en", SG: "en", ZA: "en",
  AE: "en", SA: "en", QA: "en", BH: "en", KW: "en", OM: "en",
  NG: "en", KE: "en", GH: "en", PH: "en", JO: "en",
};

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  FR: "EUR", BE: "EUR", ES: "EUR", DE: "EUR", IT: "EUR", PT: "EUR", LU: "EUR", MC: "EUR", AT: "EUR", IE: "EUR", NL: "EUR", FI: "EUR", GR: "EUR",
  SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
  SE: "SEK", DK: "DKK", NO: "NOK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN",
  GB: "GBP", CH: "CHF", UA: "UAH", RS: "RSD", IS: "ISK", GE: "GEL", MD: "MDL",
  US: "USD", CA: "CAD", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  UY: "UYU", BO: "BOB", PY: "PYG", VE: "VES", DO: "DOP", CR: "CRC", GT: "GTQ", PA: "PAB", JM: "JMD", TT: "TTD",
  MA: "MAD", TN: "TND", DZ: "DZD", SN: "XOF", CI: "XOF", CM: "XAF", ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS",
  EG: "EGP", ET: "ETB", TZ: "TZS", UG: "UGX", MU: "MUR", RW: "RWF",
  AE: "AED", SA: "SAR", QA: "QAR", BH: "BHD", KW: "KWD", OM: "OMR", JO: "JOD", IL: "ILS", LB: "LBP", IQ: "IQD",
  TR: "TRY",
  JP: "JPY", CN: "CNY", KR: "KRW", IN: "INR", SG: "SGD", MY: "MYR", TH: "THB", VN: "VND", PH: "PHP", ID: "IDR",
  TW: "TWD", HK: "HKD", BD: "BDT", PK: "PKR", LK: "LKR", NP: "NPR", MM: "MMK", KH: "KHR", KZ: "KZT",
  AU: "AUD", NZ: "NZD", FJ: "FJD", PG: "PGK",
};
