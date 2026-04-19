import { COUNTRY_CURRENCY_MAP } from "@/lib/geo/country-currency-map";

/** Language codes keyed by ISO 3166-1 alpha-2 country code. */
const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  AE: "ar", SA: "ar", QA: "ar", BH: "ar", KW: "ar", OM: "ar", JO: "ar", IQ: "ar", LB: "ar", EG: "ar",
  MA: "fr", TN: "fr", DZ: "fr", SN: "fr", CI: "fr", CM: "fr",
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", CH: "fr",
  DE: "de", AT: "de",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  PT: "pt", BR: "pt",
  IT: "it",
  NL: "nl",
  TR: "tr",
  JP: "ja", CN: "zh", KR: "ko", IN: "hi",
  US: "en", GB: "en", CA: "en", AU: "en", NZ: "en", IE: "en",
  ZA: "en", NG: "en", KE: "en", GH: "en",
};

/** IANA timezone identifiers keyed by ISO 3166-1 alpha-2 country code. */
const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  AE: "Asia/Dubai", SA: "Asia/Riyadh", QA: "Asia/Qatar", BH: "Asia/Bahrain",
  KW: "Asia/Kuwait", OM: "Asia/Muscat", JO: "Asia/Amman", IQ: "Asia/Baghdad",
  LB: "Asia/Beirut", EG: "Africa/Cairo",
  MA: "Africa/Casablanca", TN: "Africa/Tunis", DZ: "Africa/Algiers",
  SN: "Africa/Dakar", CI: "Africa/Abidjan", CM: "Africa/Douala",
  FR: "Europe/Paris", BE: "Europe/Brussels", DE: "Europe/Berlin",
  ES: "Europe/Madrid", IT: "Europe/Rome", PT: "Europe/Lisbon",
  NL: "Europe/Amsterdam", AT: "Europe/Vienna", CH: "Europe/Zurich",
  GB: "Europe/London", IE: "Europe/Dublin",
  US: "America/New_York", CA: "America/Toronto",
  MX: "America/Mexico_City", BR: "America/Sao_Paulo",
  AR: "America/Argentina/Buenos_Aires",
  IN: "Asia/Kolkata", JP: "Asia/Tokyo", CN: "Asia/Shanghai",
  KR: "Asia/Seoul", AU: "Australia/Sydney", NZ: "Pacific/Auckland",
  ZA: "Africa/Johannesburg", NG: "Africa/Lagos", KE: "Africa/Nairobi",
  TR: "Europe/Istanbul",
};

export interface GeoDefaults {
  currency: string;
  defaultLanguage: string;
  timezone: string;
}

/**
 * Return currency, default language, and timezone for a country code.
 * Merges with the caller's current state, preserving non-empty values.
 */
export function applyGeoDefaults(
  countryCode: string,
  current: { currency: string; defaultLanguage: string; timezone: string },
): GeoDefaults {
  const code = countryCode?.toUpperCase() ?? "";
  return {
    currency: current.currency || COUNTRY_CURRENCY_MAP[code] || "USD",
    defaultLanguage: current.defaultLanguage || COUNTRY_LANGUAGE_MAP[code] || "en",
    timezone: current.timezone || COUNTRY_TIMEZONE_MAP[code] || "UTC",
  };
}
