/**
 * Geo Defaults — Centralized country/city → currency/language/timezone inference.
 * Single source of truth for all form prefill logic.
 * Rules:
 *  - Never override user input
 *  - Only prefill if field is empty
 *  - Covers 30+ countries for global readiness
 */

export interface GeoDefaults {
  currency: string;
  defaultLanguage: string;
  timezone: string;
}

const COUNTRY_DEFAULTS: Record<string, GeoDefaults> = {
  // Middle East
  AE: { currency: "AED", defaultLanguage: "ar", timezone: "Asia/Dubai" },
  UAE: { currency: "AED", defaultLanguage: "ar", timezone: "Asia/Dubai" },
  SA: { currency: "SAR", defaultLanguage: "ar", timezone: "Asia/Riyadh" },
  KW: { currency: "KWD", defaultLanguage: "ar", timezone: "Asia/Kuwait" },
  QA: { currency: "QAR", defaultLanguage: "ar", timezone: "Asia/Qatar" },
  BH: { currency: "BHD", defaultLanguage: "ar", timezone: "Asia/Bahrain" },
  OM: { currency: "OMR", defaultLanguage: "ar", timezone: "Asia/Muscat" },
  JO: { currency: "JOD", defaultLanguage: "ar", timezone: "Asia/Amman" },
  LB: { currency: "LBP", defaultLanguage: "ar", timezone: "Asia/Beirut" },
  IQ: { currency: "IQD", defaultLanguage: "ar", timezone: "Asia/Baghdad" },

  // Africa
  MA: { currency: "MAD", defaultLanguage: "fr", timezone: "Africa/Casablanca" },
  TN: { currency: "TND", defaultLanguage: "fr", timezone: "Africa/Tunis" },
  DZ: { currency: "DZD", defaultLanguage: "fr", timezone: "Africa/Algiers" },
  EG: { currency: "EGP", defaultLanguage: "ar", timezone: "Africa/Cairo" },
  NG: { currency: "NGN", defaultLanguage: "en", timezone: "Africa/Lagos" },
  SN: { currency: "XOF", defaultLanguage: "fr", timezone: "Africa/Dakar" },
  CI: { currency: "XOF", defaultLanguage: "fr", timezone: "Africa/Abidjan" },
  CM: { currency: "XAF", defaultLanguage: "fr", timezone: "Africa/Douala" },
  KE: { currency: "KES", defaultLanguage: "en", timezone: "Africa/Nairobi" },
  ZA: { currency: "ZAR", defaultLanguage: "en", timezone: "Africa/Johannesburg" },
  GH: { currency: "GHS", defaultLanguage: "en", timezone: "Africa/Accra" },

  // Europe
  FR: { currency: "EUR", defaultLanguage: "fr", timezone: "Europe/Paris" },
  DE: { currency: "EUR", defaultLanguage: "de", timezone: "Europe/Berlin" },
  ES: { currency: "EUR", defaultLanguage: "es", timezone: "Europe/Madrid" },
  IT: { currency: "EUR", defaultLanguage: "it", timezone: "Europe/Rome" },
  PT: { currency: "EUR", defaultLanguage: "pt", timezone: "Europe/Lisbon" },
  NL: { currency: "EUR", defaultLanguage: "nl", timezone: "Europe/Amsterdam" },
  BE: { currency: "EUR", defaultLanguage: "fr", timezone: "Europe/Brussels" },
  GB: { currency: "GBP", defaultLanguage: "en", timezone: "Europe/London" },
  UK: { currency: "GBP", defaultLanguage: "en", timezone: "Europe/London" },
  TR: { currency: "TRY", defaultLanguage: "tr", timezone: "Europe/Istanbul" },
  CH: { currency: "CHF", defaultLanguage: "fr", timezone: "Europe/Zurich" },

  // Americas
  US: { currency: "USD", defaultLanguage: "en", timezone: "America/New_York" },
  CA: { currency: "CAD", defaultLanguage: "en", timezone: "America/Toronto" },
  MX: { currency: "MXN", defaultLanguage: "es", timezone: "America/Mexico_City" },
  BR: { currency: "BRL", defaultLanguage: "pt", timezone: "America/Sao_Paulo" },
  CO: { currency: "COP", defaultLanguage: "es", timezone: "America/Bogota" },
  AR: { currency: "ARS", defaultLanguage: "es", timezone: "America/Argentina/Buenos_Aires" },

  // Asia
  IN: { currency: "INR", defaultLanguage: "hi", timezone: "Asia/Kolkata" },
  PK: { currency: "PKR", defaultLanguage: "ur", timezone: "Asia/Karachi" },
  BD: { currency: "BDT", defaultLanguage: "bn", timezone: "Asia/Dhaka" },
  MY: { currency: "MYR", defaultLanguage: "en", timezone: "Asia/Kuala_Lumpur" },
  SG: { currency: "SGD", defaultLanguage: "en", timezone: "Asia/Singapore" },
  PH: { currency: "PHP", defaultLanguage: "en", timezone: "Asia/Manila" },
  ID: { currency: "IDR", defaultLanguage: "id", timezone: "Asia/Jakarta" },
  JP: { currency: "JPY", defaultLanguage: "ja", timezone: "Asia/Tokyo" },
  CN: { currency: "CNY", defaultLanguage: "zh", timezone: "Asia/Shanghai" },
  KR: { currency: "KRW", defaultLanguage: "ko", timezone: "Asia/Seoul" },

  // Oceania
  AU: { currency: "AUD", defaultLanguage: "en", timezone: "Australia/Sydney" },
  NZ: { currency: "NZD", defaultLanguage: "en", timezone: "Pacific/Auckland" },
};

// Common name → ISO code mapping for fuzzy matching
const NAME_TO_CODE: Record<string, string> = {
  "united arab emirates": "AE",
  "uae": "AE",
  "emirates": "AE",
  "saudi arabia": "SA",
  "saudi": "SA",
  "morocco": "MA",
  "maroc": "MA",
  "france": "FR",
  "germany": "DE",
  "allemagne": "DE",
  "spain": "ES",
  "espagne": "ES",
  "italy": "IT",
  "italie": "IT",
  "portugal": "PT",
  "netherlands": "NL",
  "belgium": "BE",
  "belgique": "BE",
  "united kingdom": "GB",
  "uk": "GB",
  "england": "GB",
  "turkey": "TR",
  "türkiye": "TR",
  "turquie": "TR",
  "switzerland": "CH",
  "suisse": "CH",
  "united states": "US",
  "usa": "US",
  "canada": "CA",
  "mexico": "MX",
  "mexique": "MX",
  "brazil": "BR",
  "brésil": "BR",
  "india": "IN",
  "inde": "IN",
  "pakistan": "PK",
  "malaysia": "MY",
  "singapore": "SG",
  "singapour": "SG",
  "japan": "JP",
  "japon": "JP",
  "china": "CN",
  "chine": "CN",
  "australia": "AU",
  "australie": "AU",
  "egypt": "EG",
  "egypte": "EG",
  "nigeria": "NG",
  "senegal": "SN",
  "sénégal": "SN",
  "ivory coast": "CI",
  "côte d'ivoire": "CI",
  "cameroon": "CM",
  "cameroun": "CM",
  "kenya": "KE",
  "south africa": "ZA",
  "ghana": "GH",
  "tunisia": "TN",
  "tunisie": "TN",
  "algeria": "DZ",
  "algérie": "DZ",
  "kuwait": "KW",
  "qatar": "QA",
  "bahrain": "BH",
  "oman": "OM",
  "jordan": "JO",
  "jordanie": "JO",
  "lebanon": "LB",
  "liban": "LB",
  "iraq": "IQ",
  "colombia": "CO",
  "colombie": "CO",
  "argentina": "AR",
  "argentine": "AR",
  "philippines": "PH",
  "indonesia": "ID",
  "indonésie": "ID",
  "south korea": "KR",
  "corée du sud": "KR",
  "new zealand": "NZ",
  "nouvelle-zélande": "NZ",
  "bangladesh": "BD",
};

/**
 * Resolve a country input (ISO code or name in any language) to an ISO code.
 */
function resolveCountryCode(input: string): string | null {
  if (!input) return null;
  const upper = input.trim().toUpperCase();
  if (COUNTRY_DEFAULTS[upper]) return upper;
  const lower = input.trim().toLowerCase();
  const code = NAME_TO_CODE[lower];
  return code ?? null;
}

/**
 * Get default geo settings for a country input.
 * Accepts ISO codes (AE, FR) or full names (UAE, France, Maroc, etc.)
 */
export function getGeoDefaults(countryInput: string): GeoDefaults | null {
  const code = resolveCountryCode(countryInput);
  if (!code) return null;
  return COUNTRY_DEFAULTS[code] ?? null;
}

/** Convenience accessors */
export function getDefaultCurrency(countryInput: string): string | null {
  return getGeoDefaults(countryInput)?.currency ?? null;
}

export function getDefaultLanguage(countryInput: string): string | null {
  return getGeoDefaults(countryInput)?.defaultLanguage ?? null;
}

export function getDefaultTimezone(countryInput: string): string | null {
  return getGeoDefaults(countryInput)?.timezone ?? null;
}

/**
 * Apply geo defaults to a set of form values.
 * Only fills empty fields — never overrides user input.
 */
export function applyGeoDefaults(
  countryInput: string,
  current: { currency?: string; defaultLanguage?: string; timezone?: string }
): { currency: string; defaultLanguage: string; timezone: string } {
  const defaults = getGeoDefaults(countryInput);
  return {
    currency: current.currency || defaults?.currency || "AED",
    defaultLanguage: current.defaultLanguage || defaults?.defaultLanguage || "en",
    timezone: current.timezone || defaults?.timezone || "",
  };
}
