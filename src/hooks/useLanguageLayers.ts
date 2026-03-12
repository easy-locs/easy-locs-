/**
 * useLanguageLayers — 3-layer language architecture for global property management.
 *
 * Layer 1: Legal Language — determined by the property's country (immutable).
 *          Used for all official documents (leases, receipts, notices).
 *
 * Layer 2: UI Language — chosen by the property owner (from profile.preferred_locale).
 *          Used for dashboard labels, navigation, and operational UI.
 *
 * Layer 3: Tenant Communication Language — chosen by the tenant (from tenant.preferred_locale).
 *          Used for messages, notifications, and portal UI sent to/displayed for the tenant.
 *
 * Example: Property in Spain
 *   Legal → "es" (Spanish contracts)
 *   Owner UI → "fr" (French dashboard)
 *   Tenant → "es" (Spanish portal)
 */

import { useMemo } from "react";
import { getCountryProfile } from "@/lib/country-profile";
import { useAuth } from "@/contexts/AuthContext";

/** Maps country codes to their official legal language */
const LEGAL_LANGUAGE_MAP: Record<string, string> = {
  // Europe
  FR: "fr", BE: "fr", LU: "fr", MC: "fr",
  DE: "de", AT: "de", CH: "de",
  ES: "es",
  IT: "it",
  PT: "pt",
  NL: "nl",
  GB: "en", IE: "en", MT: "en",
  PL: "pl", CZ: "cs", SK: "sk", HU: "hu",
  SE: "sv", DK: "da", NO: "nb", FI: "fi", IS: "is",
  GR: "el", CY: "el",
  RO: "ro", BG: "bg", HR: "hr", SI: "sl",
  LT: "lt", LV: "lv", EE: "et",
  RS: "sr", BA: "bs", ME: "sr", MK: "mk", AL: "sq", XK: "sq",
  UA: "uk", GE: "ka", MD: "ro",
  // Middle East
  AE: "ar", SA: "ar", QA: "ar", BH: "ar", KW: "ar", OM: "ar",
  LB: "ar", JO: "ar", IQ: "ar", EG: "ar", LY: "ar", SD: "ar",
  IL: "he", TR: "tr",
  // Africa
  MA: "fr", TN: "fr", DZ: "fr", SN: "fr", CI: "fr", CM: "fr",
  GA: "fr", CG: "fr", CD: "fr", MG: "fr", BF: "fr", ML: "fr",
  NE: "fr", TD: "fr", BJ: "fr", TG: "fr", GN: "fr", RW: "fr",
  MU: "en", ZA: "en", NG: "en", KE: "en", GH: "en",
  TZ: "en", UG: "en", MW: "en", ZM: "en", ZW: "en", BW: "en", NA: "en",
  ET: "am", MZ: "pt", AO: "pt",
  // Americas
  US: "en", CA: "en", JM: "en", TT: "en",
  BR: "pt",
  MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  UY: "es", EC: "es", VE: "es", DO: "es", CR: "es", PA: "es",
  GT: "es", BO: "es", PY: "es", HN: "es", SV: "es", NI: "es", CU: "es",
  // Asia-Pacific
  JP: "ja", KR: "ko", CN: "zh", TW: "zh", HK: "zh",
  IN: "en", SG: "en", MY: "ms", TH: "th", VN: "vi",
  PH: "en", ID: "id", AU: "en", NZ: "en",
  PK: "ur", BD: "bn", LK: "si", NP: "ne",
  KH: "km", MM: "my", KZ: "kk",
};

export function getLegalLanguage(countryCode: string): string {
  return LEGAL_LANGUAGE_MAP[countryCode] || "en";
}

export interface LanguageLayers {
  /** Language for official/legal documents (determined by property country) */
  legalLanguage: string;
  /** Language for property owner's UI (from profile.preferred_locale or browser) */
  ownerUiLanguage: string;
  /** Language for tenant communication (from tenant.preferred_locale or country default) */
  tenantLanguage: string;
  /** Country code of the property */
  propertyCountry: string;
}

/**
 * Returns the 3 language layers for a given property country.
 * @param propertyCountry ISO country code (e.g., "ES")
 * @param tenantLocale Optional tenant's preferred locale (e.g., "es")
 */
export function useLanguageLayers(
  propertyCountry: string,
  tenantLocale?: string | null,
): LanguageLayers {
  const { userCountry } = useAuth();

  return useMemo(() => {
    const profile = getCountryProfile(propertyCountry);

    // Layer 1: Legal language — always from country
    const legalLanguage = getLegalLanguage(propertyCountry);

    // Layer 2: Owner UI language — from their profile locale or browser
    const ownerUiLanguage = (() => {
      try {
        const stored = localStorage.getItem("easylocs_locale");
        if (stored) return stored;
      } catch { /* ignore */ }
      return navigator.language?.slice(0, 2) || "en";
    })();

    // Layer 3: Tenant language — explicit choice > country default
    const tenantLanguage = tenantLocale || profile.defaultLanguage || legalLanguage;

    return {
      legalLanguage,
      ownerUiLanguage,
      tenantLanguage,
      propertyCountry,
    };
  }, [propertyCountry, tenantLocale, userCountry]);
}

/**
 * Get language layers without React hooks (for edge functions, generators).
 */
export function getLanguageLayers(
  propertyCountry: string,
  ownerLocale?: string,
  tenantLocale?: string,
): LanguageLayers {
  const profile = getCountryProfile(propertyCountry);
  return {
    legalLanguage: getLegalLanguage(propertyCountry),
    ownerUiLanguage: ownerLocale || "en",
    tenantLanguage: tenantLocale || profile.defaultLanguage || getLegalLanguage(propertyCountry),
    propertyCountry,
  };
}
