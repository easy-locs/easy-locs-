import type { CountryProfile, CityProfile } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_global_intelligence";

export function getCountryProfile(_countryCode: string): CountryProfile | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return null;
  return null;
}

export function getCityProfile(_countryCode: string, _cityId: string): CityProfile | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return null;
  return null;
}

export function listAvailableCountries(): string[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return [];
}

export function listCitiesForCountry(_countryCode: string): string[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return [];
}

export function isModuleAvailable(_countryCode: string, _module: string): boolean {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return false;
  return false;
}
