import type { CountryProfile, CityProfile } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_global_intelligence";

const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  AE: {
    code: "AE",
    defaultLanguage: "ar",
    supportedLanguages: ["ar", "en", "hi", "ur", "fr"],
    defaultCurrency: "AED",
    timezones: ["Asia/Dubai"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events", "religious"],
    religionModuleAvailable: true,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: true },
    culturalFlags: { rtl_primary: true, islamic_calendar: true, friday_weekend: true },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: false },
  },
  FR: {
    code: "FR",
    defaultLanguage: "fr",
    supportedLanguages: ["fr", "en", "ar", "es", "de"],
    defaultCurrency: "EUR",
    timezones: ["Europe/Paris"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events"],
    religionModuleAvailable: false,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: false },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: true, ccpa: false, local_data_residency: true },
  },
  US: {
    code: "US",
    defaultLanguage: "en",
    supportedLanguages: ["en", "es", "fr", "zh", "ar"],
    defaultCurrency: "USD",
    timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Pacific/Honolulu"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events"],
    religionModuleAvailable: false,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: false },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: false, ccpa: true, local_data_residency: false },
  },
  GB: {
    code: "GB",
    defaultLanguage: "en",
    supportedLanguages: ["en", "ar", "fr", "pl", "ur"],
    defaultCurrency: "GBP",
    timezones: ["Europe/London"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events"],
    religionModuleAvailable: false,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: false },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: true, ccpa: false, local_data_residency: false },
  },
  SA: {
    code: "SA",
    defaultLanguage: "ar",
    supportedLanguages: ["ar", "en", "ur", "hi"],
    defaultCurrency: "SAR",
    timezones: ["Asia/Riyadh"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events", "religious"],
    religionModuleAvailable: true,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: true },
    culturalFlags: { rtl_primary: true, islamic_calendar: true, friday_weekend: true },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: true },
  },
  EG: {
    code: "EG",
    defaultLanguage: "ar",
    supportedLanguages: ["ar", "en", "fr"],
    defaultCurrency: "EGP",
    timezones: ["Africa/Cairo"],
    availableModules: ["finance", "forex", "weather", "news", "events", "religious"],
    religionModuleAvailable: true,
    providerMatrix: { weather: true, forex: true, news: true, traffic: false, events: true, prayer_times: true },
    culturalFlags: { rtl_primary: true, islamic_calendar: true, friday_weekend: true },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: false },
  },
  MA: {
    code: "MA",
    defaultLanguage: "fr",
    supportedLanguages: ["fr", "ar", "en", "es"],
    defaultCurrency: "MAD",
    timezones: ["Africa/Casablanca"],
    availableModules: ["finance", "forex", "weather", "news", "events", "religious"],
    religionModuleAvailable: true,
    providerMatrix: { weather: true, forex: true, news: true, traffic: false, events: true, prayer_times: true },
    culturalFlags: { rtl_primary: false, islamic_calendar: true, friday_weekend: false },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: false },
  },
  DE: {
    code: "DE",
    defaultLanguage: "de",
    supportedLanguages: ["de", "en", "tr", "ar", "fr"],
    defaultCurrency: "EUR",
    timezones: ["Europe/Berlin"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events"],
    religionModuleAvailable: false,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: false },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: true, ccpa: false, local_data_residency: true },
  },
  IN: {
    code: "IN",
    defaultLanguage: "hi",
    supportedLanguages: ["hi", "en", "ta", "te", "bn", "ur", "mr"],
    defaultCurrency: "INR",
    timezones: ["Asia/Kolkata"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events"],
    religionModuleAvailable: false,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: false },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: true },
  },
  BR: {
    code: "BR",
    defaultLanguage: "pt",
    supportedLanguages: ["pt", "en", "es"],
    defaultCurrency: "BRL",
    timezones: ["America/Sao_Paulo", "America/Manaus", "America/Belem"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events"],
    religionModuleAvailable: false,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: false },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: true },
  },
  NG: {
    code: "NG",
    defaultLanguage: "en",
    supportedLanguages: ["en", "ha", "yo", "ig"],
    defaultCurrency: "NGN",
    timezones: ["Africa/Lagos"],
    availableModules: ["finance", "forex", "weather", "news", "events"],
    religionModuleAvailable: true,
    providerMatrix: { weather: true, forex: true, news: true, traffic: false, events: true, prayer_times: true },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: false },
  },
  JP: {
    code: "JP",
    defaultLanguage: "ja",
    supportedLanguages: ["ja", "en"],
    defaultCurrency: "JPY",
    timezones: ["Asia/Tokyo"],
    availableModules: ["finance", "forex", "weather", "news", "traffic", "events"],
    religionModuleAvailable: false,
    providerMatrix: { weather: true, forex: true, news: true, traffic: true, events: true, prayer_times: false },
    culturalFlags: { rtl_primary: false, islamic_calendar: false, friday_weekend: false },
    complianceFlags: { gdpr: false, ccpa: false, local_data_residency: true },
  },
};

const CITY_PROFILES: Record<string, CityProfile[]> = {
  AE: [
    { countryCode: "AE", cityId: "dubai", cityName: "Dubai", region: "Dubai", timezone: "Asia/Dubai", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 3500000 },
    { countryCode: "AE", cityId: "abu_dhabi", cityName: "Abu Dhabi", region: "Abu Dhabi", timezone: "Asia/Dubai", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 1500000 },
    { countryCode: "AE", cityId: "sharjah", cityName: "Sharjah", region: "Sharjah", timezone: "Asia/Dubai", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 1400000 },
  ],
  FR: [
    { countryCode: "FR", cityId: "paris", cityName: "Paris", region: "Île-de-France", timezone: "Europe/Paris", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 2200000 },
    { countryCode: "FR", cityId: "lyon", cityName: "Lyon", region: "Auvergne-Rhône-Alpes", timezone: "Europe/Paris", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 520000 },
    { countryCode: "FR", cityId: "marseille", cityName: "Marseille", region: "Provence-Alpes-Côte d'Azur", timezone: "Europe/Paris", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 870000 },
  ],
  US: [
    { countryCode: "US", cityId: "new_york", cityName: "New York", region: "New York", timezone: "America/New_York", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 8300000 },
    { countryCode: "US", cityId: "los_angeles", cityName: "Los Angeles", region: "California", timezone: "America/Los_Angeles", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 3900000 },
    { countryCode: "US", cityId: "chicago", cityName: "Chicago", region: "Illinois", timezone: "America/Chicago", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 2700000 },
  ],
  SA: [
    { countryCode: "SA", cityId: "riyadh", cityName: "Riyadh", region: "Riyadh", timezone: "Asia/Riyadh", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 7700000 },
    { countryCode: "SA", cityId: "jeddah", cityName: "Jeddah", region: "Makkah", timezone: "Asia/Riyadh", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 4700000 },
    { countryCode: "SA", cityId: "makkah", cityName: "Makkah", region: "Makkah", timezone: "Asia/Riyadh", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 2000000 },
  ],
  EG: [
    { countryCode: "EG", cityId: "cairo", cityName: "Cairo", region: "Cairo", timezone: "Africa/Cairo", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 10000000 },
    { countryCode: "EG", cityId: "alexandria", cityName: "Alexandria", region: "Alexandria", timezone: "Africa/Cairo", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 5200000 },
  ],
  MA: [
    { countryCode: "MA", cityId: "casablanca", cityName: "Casablanca", region: "Casablanca-Settat", timezone: "Africa/Casablanca", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 3700000 },
    { countryCode: "MA", cityId: "marrakech", cityName: "Marrakech", region: "Marrakech-Safi", timezone: "Africa/Casablanca", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 930000 },
  ],
  GB: [
    { countryCode: "GB", cityId: "london", cityName: "London", region: "England", timezone: "Europe/London", localProviders: ["weather", "forex", "traffic", "events"], localCommerceActive: false, population: 9000000 },
    { countryCode: "GB", cityId: "manchester", cityName: "Manchester", region: "England", timezone: "Europe/London", localProviders: ["weather", "forex", "events"], localCommerceActive: false, population: 550000 },
  ],
};

export function getCountryProfile(countryCode: string): CountryProfile | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return null;
  return COUNTRY_PROFILES[countryCode.toUpperCase()] ?? null;
}

export function getCityProfile(countryCode: string, cityId: string): CityProfile | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return null;
  const cities = CITY_PROFILES[countryCode.toUpperCase()];
  if (!cities) return null;
  return cities.find(c => c.cityId === cityId) ?? null;
}

export function listAvailableCountries(): string[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return Object.keys(COUNTRY_PROFILES);
}

export function listCitiesForCountry(countryCode: string): string[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  const cities = CITY_PROFILES[countryCode.toUpperCase()];
  if (!cities) return [];
  return cities.map(c => c.cityId);
}

export function isModuleAvailable(countryCode: string, module: string): boolean {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return false;
  const profile = COUNTRY_PROFILES[countryCode.toUpperCase()];
  if (!profile) return false;
  return profile.availableModules.includes(module);
}

export function getDefaultCurrency(countryCode: string): string | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return null;
  const profile = COUNTRY_PROFILES[countryCode.toUpperCase()];
  return profile?.defaultCurrency ?? null;
}

export function getCountryTimezones(countryCode: string): string[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  const profile = COUNTRY_PROFILES[countryCode.toUpperCase()];
  return profile?.timezones ?? [];
}
