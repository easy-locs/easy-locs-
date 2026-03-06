import { useMemo } from "react";
import { getCountryProfile, type CountryProfile } from "@/lib/country-profile";

/**
 * Hook that returns the full CountryProfile for a given property country.
 * All legal, fiscal, accounting, template, and language logic is
 * strictly scoped to this country — no cross-country mixing.
 */
export function useCountryProfile(propertyCountry: string): CountryProfile {
  return useMemo(() => getCountryProfile(propertyCountry), [propertyCountry]);
}
