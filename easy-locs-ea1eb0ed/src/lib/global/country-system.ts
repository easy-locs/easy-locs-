/**
 * country-system — Multi-country isolation with per-country currency, compliance, and pricing.
 * Ensures no cross-country data confusion.
 */

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  vatRate: number;
  platformCommission: number;
  languages: string[];
  complianceRules: ComplianceRules;
  paymentMethods: string[];
  active: boolean;
}

export interface ComplianceRules {
  requiresTradelicence: boolean;
  requiresVAT: boolean;
  requiresIdentityVerification: boolean;
  maxListingsPerProvider: number;
  dataRetentionDays: number;
  requiredProviderFields: string[];
}

export interface FXRate {
  from: string;
  to: string;
  rate: number;
  spread: number;
  effectiveRate: number;
  updatedAt: string;
  source: string;
}

const PLATFORM_SPREAD = 0.02;

const COUNTRIES: Record<string, CountryConfig> = {
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "د.إ",
    locale: "ar-AE",
    timezone: "Asia/Dubai",
    vatRate: 0.05,
    platformCommission: 0.05,
    languages: ["ar", "en"],
    complianceRules: {
      requiresTradelicence: true,
      requiresVAT: true,
      requiresIdentityVerification: true,
      maxListingsPerProvider: 500,
      dataRetentionDays: 2555,
      requiredProviderFields: ["trade_licence", "phone", "address", "emirate"],
    },
    paymentMethods: ["wallet", "card", "apple_pay", "cash"],
    active: true,
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    currencySymbol: "﷼",
    locale: "ar-SA",
    timezone: "Asia/Riyadh",
    vatRate: 0.15,
    platformCommission: 0.05,
    languages: ["ar", "en"],
    complianceRules: {
      requiresTradelicence: true,
      requiresVAT: true,
      requiresIdentityVerification: true,
      maxListingsPerProvider: 500,
      dataRetentionDays: 1825,
      requiredProviderFields: ["commercial_registration", "phone", "address", "city"],
    },
    paymentMethods: ["wallet", "card", "mada", "stc_pay", "cash"],
    active: true,
  },
  EG: {
    code: "EG",
    name: "Egypt",
    currency: "EGP",
    currencySymbol: "E£",
    locale: "ar-EG",
    timezone: "Africa/Cairo",
    vatRate: 0.14,
    platformCommission: 0.05,
    languages: ["ar", "en"],
    complianceRules: {
      requiresTradelicence: true,
      requiresVAT: true,
      requiresIdentityVerification: true,
      maxListingsPerProvider: 300,
      dataRetentionDays: 1825,
      requiredProviderFields: ["tax_id", "phone", "address", "governorate"],
    },
    paymentMethods: ["wallet", "card", "fawry", "cash"],
    active: true,
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    locale: "en-GB",
    timezone: "Europe/London",
    vatRate: 0.20,
    platformCommission: 0.05,
    languages: ["en"],
    complianceRules: {
      requiresTradelicence: false,
      requiresVAT: true,
      requiresIdentityVerification: true,
      maxListingsPerProvider: 500,
      dataRetentionDays: 2555,
      requiredProviderFields: ["company_number", "phone", "address", "postcode"],
    },
    paymentMethods: ["wallet", "card", "apple_pay", "google_pay"],
    active: false,
  },
  FR: {
    code: "FR",
    name: "France",
    currency: "EUR",
    currencySymbol: "€",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    vatRate: 0.20,
    platformCommission: 0.05,
    languages: ["fr", "en"],
    complianceRules: {
      requiresTradelicence: false,
      requiresVAT: true,
      requiresIdentityVerification: true,
      maxListingsPerProvider: 500,
      dataRetentionDays: 1825,
      requiredProviderFields: ["siret", "phone", "address", "postal_code"],
    },
    paymentMethods: ["wallet", "card", "apple_pay", "google_pay"],
    active: false,
  },
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    locale: "en-US",
    timezone: "America/New_York",
    vatRate: 0,
    platformCommission: 0.05,
    languages: ["en", "es"],
    complianceRules: {
      requiresTradelicence: false,
      requiresVAT: false,
      requiresIdentityVerification: true,
      maxListingsPerProvider: 1000,
      dataRetentionDays: 1825,
      requiredProviderFields: ["ein", "phone", "address", "state"],
    },
    paymentMethods: ["wallet", "card", "apple_pay", "google_pay"],
    active: false,
  },
};

let currentCountry = "AE";

export function setCurrentCountry(code: string): void {
  if (!COUNTRIES[code]) throw new Error(`Unknown country code: ${code}`);
  currentCountry = code;
}

export function getCurrentCountry(): CountryConfig {
  return COUNTRIES[currentCountry];
}

export function getCountryConfig(code: string): CountryConfig | undefined {
  return COUNTRIES[code];
}

export function getAllCountries(): CountryConfig[] {
  return Object.values(COUNTRIES);
}

export function getActiveCountries(): CountryConfig[] {
  return Object.values(COUNTRIES).filter(c => c.active);
}

export function getCurrencyForCountry(code: string): string {
  return COUNTRIES[code]?.currency ?? "USD";
}

export function formatPrice(amount: number, countryCode?: string): string {
  const country = COUNTRIES[countryCode || currentCountry];
  if (!country) return `${amount.toFixed(2)}`;
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateVAT(amount: number, countryCode?: string): { net: number; vat: number; gross: number } {
  const country = COUNTRIES[countryCode || currentCountry];
  const vatRate = country?.vatRate ?? 0;
  const vat = amount * vatRate;
  return { net: amount, vat: Math.round(vat * 100) / 100, gross: Math.round((amount + vat) * 100) / 100 };
}

export function calculateCommission(amount: number, countryCode?: string): number {
  const country = COUNTRIES[countryCode || currentCountry];
  const rate = country?.platformCommission ?? 0.05;
  return Math.round(amount * rate * 100) / 100;
}

const fxCache = new Map<string, FXRate>();

export function setFXRate(from: string, to: string, rate: number, source = "ecb"): void {
  const now = new Date().toISOString();
  const effectiveRate = rate * (1 + PLATFORM_SPREAD);
  fxCache.set(`${from}:${to}`, { from, to, rate, spread: PLATFORM_SPREAD, effectiveRate, updatedAt: now, source });
  fxCache.set(`${to}:${from}`, { from: to, to: from, rate: 1 / rate, spread: PLATFORM_SPREAD, effectiveRate: (1 / rate) * (1 + PLATFORM_SPREAD), updatedAt: now, source });
}

export function getFXRate(from: string, to: string): FXRate | undefined {
  if (from === to) return { from, to, rate: 1, spread: 0, effectiveRate: 1, updatedAt: new Date().toISOString(), source: "identity" };
  return fxCache.get(`${from}:${to}`);
}

export function convertCurrency(amount: number, from: string, to: string): { converted: number; rate: FXRate } | null {
  const fx = getFXRate(from, to);
  if (!fx) return null;
  return { converted: Math.round(amount * fx.effectiveRate * 100) / 100, rate: fx };
}

export function validateProviderForCountry(
  provider: { fields: Record<string, unknown> },
  countryCode?: string
): { valid: boolean; missingFields: string[] } {
  const country = COUNTRIES[countryCode || currentCountry];
  if (!country) return { valid: false, missingFields: ["country_config_missing"] };

  const missing = country.complianceRules.requiredProviderFields?.filter(
    f => !provider.fields[f]
  ) ?? [];

  return { valid: missing.length === 0, missingFields: missing };
}

export function runCountrySystem(): void {
  const active = getActiveCountries();
  console.log(`[country-system] ${active.length} active countries, ${Object.keys(COUNTRIES).length} total configured — current: ${currentCountry} (${getCurrentCountry().currency})`);
}
