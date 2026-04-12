import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type {
  CanonicalCountryContext,
  CanonicalLocaleContext,
  CanonicalCurrencyContext,
  CurrencyCode,
  GovernanceViolation,
} from "@/domains/shared/canonical-types";

const countryRegistry = new Map<string, CanonicalCountryContext>();
const localeRegistry = new Map<string, CanonicalLocaleContext>();
const currencyRegistry = new Map<CurrencyCode, CanonicalCurrencyContext>();
const localizationViolations: GovernanceViolation[] = [];

const DEFAULT_COUNTRIES: CanonicalCountryContext[] = [
  { countryCode: "AE", countryName: "United Arab Emirates", defaultLocale: "ar-AE", defaultCurrency: "AED", supportedCurrencies: ["AED", "USD"], supportedLocales: ["ar-AE", "en-AE"], timezone: "Asia/Dubai", writingDirection: "rtl", unitSystem: "metric", calendarType: "both", legalDisclosures: [], culturalFlags: ["islamic", "gcc"] },
  { countryCode: "SA", countryName: "Saudi Arabia", defaultLocale: "ar-SA", defaultCurrency: "SAR", supportedCurrencies: ["SAR", "USD"], supportedLocales: ["ar-SA", "en-SA"], timezone: "Asia/Riyadh", writingDirection: "rtl", unitSystem: "metric", calendarType: "hijri", legalDisclosures: [], culturalFlags: ["islamic", "gcc"] },
  { countryCode: "FR", countryName: "France", defaultLocale: "fr-FR", defaultCurrency: "EUR", supportedCurrencies: ["EUR"], supportedLocales: ["fr-FR", "en-FR"], timezone: "Europe/Paris", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", legalDisclosures: [], culturalFlags: ["european", "francophone"] },
  { countryCode: "GB", countryName: "United Kingdom", defaultLocale: "en-GB", defaultCurrency: "GBP", supportedCurrencies: ["GBP", "EUR"], supportedLocales: ["en-GB"], timezone: "Europe/London", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", legalDisclosures: [], culturalFlags: ["european"] },
  { countryCode: "US", countryName: "United States", defaultLocale: "en-US", defaultCurrency: "USD", supportedCurrencies: ["USD"], supportedLocales: ["en-US", "es-US"], timezone: "America/New_York", writingDirection: "ltr", unitSystem: "imperial", calendarType: "gregorian", legalDisclosures: [], culturalFlags: [] },
  { countryCode: "MA", countryName: "Morocco", defaultLocale: "fr-MA", defaultCurrency: "MAD", supportedCurrencies: ["MAD", "EUR"], supportedLocales: ["fr-MA", "ar-MA"], timezone: "Africa/Casablanca", writingDirection: "ltr", unitSystem: "metric", calendarType: "both", legalDisclosures: [], culturalFlags: ["islamic", "francophone", "maghreb"] },
  { countryCode: "EG", countryName: "Egypt", defaultLocale: "ar-EG", defaultCurrency: "EGP", supportedCurrencies: ["EGP", "USD"], supportedLocales: ["ar-EG", "en-EG"], timezone: "Africa/Cairo", writingDirection: "rtl", unitSystem: "metric", calendarType: "both", legalDisclosures: [], culturalFlags: ["islamic", "mena"] },
  { countryCode: "TN", countryName: "Tunisia", defaultLocale: "fr-TN", defaultCurrency: "TND", supportedCurrencies: ["TND", "EUR"], supportedLocales: ["fr-TN", "ar-TN"], timezone: "Africa/Tunis", writingDirection: "ltr", unitSystem: "metric", calendarType: "both", legalDisclosures: [], culturalFlags: ["islamic", "francophone", "maghreb"] },
  { countryCode: "TR", countryName: "Turkey", defaultLocale: "tr-TR", defaultCurrency: "TRY", supportedCurrencies: ["TRY", "USD", "EUR"], supportedLocales: ["tr-TR", "en-TR"], timezone: "Europe/Istanbul", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", legalDisclosures: [], culturalFlags: ["islamic"] },
  { countryCode: "IN", countryName: "India", defaultLocale: "en-IN", defaultCurrency: "INR", supportedCurrencies: ["INR", "USD"], supportedLocales: ["en-IN", "hi-IN"], timezone: "Asia/Kolkata", writingDirection: "ltr", unitSystem: "metric", calendarType: "gregorian", legalDisclosures: [], culturalFlags: [] },
];

const DEFAULT_CURRENCIES: CanonicalCurrencyContext[] = [
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimalPlaces: 2, thousandSeparator: ",", decimalSeparator: ".", symbolPosition: "before", minimumAmount: 1, maximumAmount: 1_000_000 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, thousandSeparator: ",", decimalSeparator: ".", symbolPosition: "before", minimumAmount: 0.01, maximumAmount: 1_000_000 },
  { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2, thousandSeparator: ".", decimalSeparator: ",", symbolPosition: "after", minimumAmount: 0.01, maximumAmount: 1_000_000 },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س", decimalPlaces: 2, thousandSeparator: ",", decimalSeparator: ".", symbolPosition: "before", minimumAmount: 1, maximumAmount: 1_000_000 },
  { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2, thousandSeparator: ",", decimalSeparator: ".", symbolPosition: "before", minimumAmount: 0.01, maximumAmount: 1_000_000 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPlaces: 2, thousandSeparator: ",", decimalSeparator: ".", symbolPosition: "before", minimumAmount: 1, maximumAmount: 10_000_000 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", decimalPlaces: 2, thousandSeparator: ".", decimalSeparator: ",", symbolPosition: "after", minimumAmount: 1, maximumAmount: 1_000_000 },
  { code: "EGP", name: "Egyptian Pound", symbol: "ج.م", decimalPlaces: 2, thousandSeparator: ",", decimalSeparator: ".", symbolPosition: "before", minimumAmount: 1, maximumAmount: 10_000_000 },
  { code: "TND", name: "Tunisian Dinar", symbol: "د.ت", decimalPlaces: 3, thousandSeparator: ".", decimalSeparator: ",", symbolPosition: "after", minimumAmount: 0.1, maximumAmount: 1_000_000 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", decimalPlaces: 2, thousandSeparator: ".", decimalSeparator: ",", symbolPosition: "before", minimumAmount: 1, maximumAmount: 10_000_000 },
  { code: "XOF", name: "CFA Franc BCEAO", symbol: "CFA", decimalPlaces: 0, thousandSeparator: ".", decimalSeparator: "", symbolPosition: "after", minimumAmount: 100, maximumAmount: 100_000_000 },
  { code: "XAF", name: "CFA Franc BEAC", symbol: "FCFA", decimalPlaces: 0, thousandSeparator: ".", decimalSeparator: "", symbolPosition: "after", minimumAmount: 100, maximumAmount: 100_000_000 },
];

function initRegistries(): void {
  if (countryRegistry.size > 0) return;
  for (const c of DEFAULT_COUNTRIES) countryRegistry.set(c.countryCode, c);
  for (const c of DEFAULT_CURRENCIES) currencyRegistry.set(c.code, c);
}

export function getCountryContext(countryCode: string): CanonicalCountryContext | null {
  initRegistries();
  return countryRegistry.get(countryCode) ?? null;
}

export function getCurrencyContext(code: CurrencyCode): CanonicalCurrencyContext | null {
  initRegistries();
  return currencyRegistry.get(code) ?? null;
}

export function getLocaleContext(locale: string): CanonicalLocaleContext | null {
  return localeRegistry.get(locale) ?? null;
}

export function formatCurrency(amount: number, code: CurrencyCode): string {
  initRegistries();
  const ctx = currencyRegistry.get(code);
  if (!ctx) return `${amount} ${code}`;

  const fixed = amount.toFixed(ctx.decimalPlaces);
  const [whole, dec] = fixed.split(".");
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ctx.thousandSeparator);
  const withDec = dec ? `${formatted}${ctx.decimalSeparator}${dec}` : formatted;

  return ctx.symbolPosition === "before"
    ? `${ctx.symbol}${withDec}`
    : `${withDec} ${ctx.symbol}`;
}

export function validateLocalization(
  text: string,
  locale: string,
  countryCode: string
): { valid: boolean; violation: GovernanceViolation | null } {
  initRegistries();
  const country = countryRegistry.get(countryCode);

  if (country && !country.supportedLocales.some((l) => locale.startsWith(l.split("-")[0]))) {
    const v: GovernanceViolation = {
      id: `l10n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "localization_mismatch",
      severity: "warning",
      source: `locale:${locale}`,
      target: `country:${countryCode}`,
      message: `Locale "${locale}" not supported in ${country.countryName}`,
      ownerDomain: "platform",
      vertical: "platform",
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { locale, countryCode, supportedLocales: country.supportedLocales },
    };
    localizationViolations.push(v);
    return { valid: false, violation: v };
  }

  return { valid: true, violation: null };
}

export function getLocalizationViolations(): GovernanceViolation[] {
  return [...localizationViolations];
}

export function getAllCountries(): CanonicalCountryContext[] {
  initRegistries();
  return Array.from(countryRegistry.values());
}

export function getAllCurrencies(): CanonicalCurrencyContext[] {
  initRegistries();
  return Array.from(currencyRegistry.values());
}

export class LocalizationEngine extends BaseEngine {
  constructor() {
    super({
      id: "localization-governance",
      name: "Localization Governance Engine",
      category: "governance",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    initRegistries();

    const recent = localizationViolations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );

    return {
      level: recent.length > 0 ? "detect" : "observe",
      findings: recent.length,
      actions: recent.map((v) => `L10N: ${v.message}`).slice(0, 5),
      duration: 0,
    };
  }
}
