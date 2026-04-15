import { COUNTRY_CURRENCY_MAP } from "@/lib/geo/country-currency-map";

export const WALLET_FALLBACK_CURRENCY = "EUR";

export const WALLET_LOW_BALANCE_CRITICAL = 20;

export const WALLET_LOW_BALANCE_WARNING = 50;

export const COUNTRY_TO_LOCALE: Record<string, string> = {
  AE: "en", SA: "ar", QA: "ar", BH: "ar", KW: "ar", OM: "ar", JO: "ar", IQ: "ar", LB: "ar",
  EG: "ar", MA: "fr", TN: "fr", DZ: "fr", SN: "fr", CI: "fr", CM: "fr",
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", CH: "fr",
  DE: "de", AT: "de",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  PT: "pt", BR: "pt",
  IT: "it",
  NL: "nl",
  TR: "tr",
  JP: "ja", CN: "zh", KR: "ko", IN: "hi",
  US: "en", GB: "en", CA: "en", AU: "en", NZ: "en", IE: "en", ZA: "en", NG: "en", KE: "en", GH: "en",
};

let _profileCountryOverride: string | null = null;

export function setProfileCountry(country: string | null) {
  _profileCountryOverride = country?.toUpperCase() || null;
}

export function getProfileCountry(): string | null {
  return _profileCountryOverride;
}

export function getWalletDefaultCurrency(profileCountry?: string | null): string {
  const pc = profileCountry?.toUpperCase() || _profileCountryOverride;
  if (pc && COUNTRY_CURRENCY_MAP[pc]) {
    return COUNTRY_CURRENCY_MAP[pc];
  }

  try {
    const stored = localStorage.getItem("app_country");
    if (stored && COUNTRY_CURRENCY_MAP[stored]) {
      return COUNTRY_CURRENCY_MAP[stored];
    }
  } catch {}

  if (typeof navigator !== "undefined") {
    const country = (navigator.language || "").split("-")[1]?.toUpperCase();
    if (country && COUNTRY_CURRENCY_MAP[country]) {
      return COUNTRY_CURRENCY_MAP[country];
    }
  }

  return WALLET_FALLBACK_CURRENCY;
}
