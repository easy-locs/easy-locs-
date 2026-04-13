export type SupportedLocale =
  | "en" | "fr" | "ar" | "es" | "de" | "it" | "pt" | "nl"
  | "tr" | "ja" | "zh" | "ko" | "ru" | "hi" | "bn"
  | "fil" | "ur" | "th" | "vi" | "ms" | "id"
  | "sw" | "am" | "ha" | "yo" | "ig"
  | "en-US" | "en-GB" | "fr-FR" | "ar-AE" | "pt-BR" | "zh-CN";

export type SupportedCurrency = "AED" | "EUR" | "USD" | "GBP" | "MAD" | "XOF" | "XAF" | "NGN" | "KES" | "ZAR" | "INR" | "JPY" | "CNY" | "BRL" | "TRY" | "SAR" | "QAR" | "KWD" | "BHD" | "OMR" | "EGP";

export interface CountryConfig {
  code: string;
  name: string;
  defaultLocale: SupportedLocale;
  defaultCurrency: SupportedCurrency;
  timezone: string;
  addressFormat: AddressFormat;
  phonePrefix: string;
  paymentMethods: string[];
  taxSystem: "vat" | "gst" | "sales_tax" | "none";
  taxRate: number;
  rtl: boolean;
}

export type AddressFormat = "street_first" | "city_first" | "postal_first" | "freeform";

export const COUNTRY_CONFIGS: CountryConfig[] = [
  { code: "AE", name: "UAE", defaultLocale: "en", defaultCurrency: "AED", timezone: "Asia/Dubai", addressFormat: "street_first", phonePrefix: "+971", paymentMethods: ["wallet", "card", "apple_pay", "google_pay", "cash"], taxSystem: "vat", taxRate: 0.05, rtl: false },
  { code: "FR", name: "France", defaultLocale: "fr", defaultCurrency: "EUR", timezone: "Europe/Paris", addressFormat: "street_first", phonePrefix: "+33", paymentMethods: ["wallet", "card", "apple_pay", "google_pay", "bank_transfer"], taxSystem: "vat", taxRate: 0.20, rtl: false },
  { code: "MA", name: "Morocco", defaultLocale: "fr", defaultCurrency: "MAD", timezone: "Africa/Casablanca", addressFormat: "street_first", phonePrefix: "+212", paymentMethods: ["wallet", "card", "cash"], taxSystem: "vat", taxRate: 0.20, rtl: false },
  { code: "SN", name: "Senegal", defaultLocale: "fr", defaultCurrency: "XOF", timezone: "Africa/Dakar", addressFormat: "freeform", phonePrefix: "+221", paymentMethods: ["wallet", "cash"], taxSystem: "vat", taxRate: 0.18, rtl: false },
  { code: "CI", name: "Ivory Coast", defaultLocale: "fr", defaultCurrency: "XOF", timezone: "Africa/Abidjan", addressFormat: "freeform", phonePrefix: "+225", paymentMethods: ["wallet", "cash"], taxSystem: "vat", taxRate: 0.18, rtl: false },
  { code: "NG", name: "Nigeria", defaultLocale: "en", defaultCurrency: "NGN", timezone: "Africa/Lagos", addressFormat: "freeform", phonePrefix: "+234", paymentMethods: ["wallet", "card", "cash", "bank_transfer"], taxSystem: "vat", taxRate: 0.075, rtl: false },
  { code: "KE", name: "Kenya", defaultLocale: "en", defaultCurrency: "KES", timezone: "Africa/Nairobi", addressFormat: "street_first", phonePrefix: "+254", paymentMethods: ["wallet", "cash"], taxSystem: "vat", taxRate: 0.16, rtl: false },
  { code: "SA", name: "Saudi Arabia", defaultLocale: "ar", defaultCurrency: "SAR", timezone: "Asia/Riyadh", addressFormat: "street_first", phonePrefix: "+966", paymentMethods: ["wallet", "card", "apple_pay", "cash"], taxSystem: "vat", taxRate: 0.15, rtl: true },
  { code: "EG", name: "Egypt", defaultLocale: "ar", defaultCurrency: "EGP", timezone: "Africa/Cairo", addressFormat: "street_first", phonePrefix: "+20", paymentMethods: ["wallet", "card", "cash"], taxSystem: "vat", taxRate: 0.14, rtl: true },
  { code: "US", name: "United States", defaultLocale: "en-US", defaultCurrency: "USD", timezone: "America/New_York", addressFormat: "street_first", phonePrefix: "+1", paymentMethods: ["wallet", "card", "apple_pay", "google_pay"], taxSystem: "sales_tax", taxRate: 0, rtl: false },
  { code: "GB", name: "United Kingdom", defaultLocale: "en-GB", defaultCurrency: "GBP", timezone: "Europe/London", addressFormat: "street_first", phonePrefix: "+44", paymentMethods: ["wallet", "card", "apple_pay", "google_pay"], taxSystem: "vat", taxRate: 0.20, rtl: false },
  { code: "IN", name: "India", defaultLocale: "en", defaultCurrency: "INR", timezone: "Asia/Kolkata", addressFormat: "street_first", phonePrefix: "+91", paymentMethods: ["wallet", "card", "cash"], taxSystem: "gst", taxRate: 0.18, rtl: false },
  { code: "BR", name: "Brazil", defaultLocale: "pt-BR", defaultCurrency: "BRL", timezone: "America/Sao_Paulo", addressFormat: "street_first", phonePrefix: "+55", paymentMethods: ["wallet", "card", "cash"], taxSystem: "vat", taxRate: 0.17, rtl: false },
  { code: "TR", name: "Turkey", defaultLocale: "tr", defaultCurrency: "TRY", timezone: "Europe/Istanbul", addressFormat: "street_first", phonePrefix: "+90", paymentMethods: ["wallet", "card", "cash"], taxSystem: "vat", taxRate: 0.18, rtl: false },
];

export function getCountryConfig(code: string): CountryConfig | undefined {
  return COUNTRY_CONFIGS.find((c) => c.code === code.toUpperCase());
}

export function getDefaultCurrency(countryCode: string): SupportedCurrency {
  return getCountryConfig(countryCode)?.defaultCurrency ?? "AED";
}

export function getDefaultLocale(countryCode: string): SupportedLocale {
  return getCountryConfig(countryCode)?.defaultLocale ?? "en";
}

export function isRTL(locale: SupportedLocale): boolean {
  return locale === "ar" || locale === "ar-AE" || locale === "ur";
}

export function getTimezone(countryCode: string): string {
  return getCountryConfig(countryCode)?.timezone ?? "UTC";
}

export function formatPhoneForCountry(phone: string, countryCode: string): string {
  const config = getCountryConfig(countryCode);
  if (!config) return phone;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return config.phonePrefix + cleaned.slice(1);
  return config.phonePrefix + cleaned;
}

export interface CurrencyConversionRate {
  from: SupportedCurrency;
  to: SupportedCurrency;
  rate: number;
  updatedAt: number;
}

const conversionRates: CurrencyConversionRate[] = [
  { from: "AED", to: "USD", rate: 0.2723, updatedAt: Date.now() },
  { from: "AED", to: "EUR", rate: 0.2510, updatedAt: Date.now() },
  { from: "USD", to: "AED", rate: 3.6725, updatedAt: Date.now() },
  { from: "EUR", to: "AED", rate: 3.9841, updatedAt: Date.now() },
  { from: "USD", to: "EUR", rate: 0.9218, updatedAt: Date.now() },
  { from: "EUR", to: "USD", rate: 1.0848, updatedAt: Date.now() },
];

export function convertCurrency(amount: number, from: SupportedCurrency, to: SupportedCurrency): number | null {
  if (from === to) return amount;
  const rate = conversionRates.find((r) => r.from === from && r.to === to);
  if (rate) return amount * rate.rate;
  const reverseRate = conversionRates.find((r) => r.from === to && r.to === from);
  if (reverseRate) return amount / reverseRate.rate;
  return null;
}

export function getAddressFormat(countryCode: string): AddressFormat {
  return getCountryConfig(countryCode)?.addressFormat ?? "street_first";
}

export function getPaymentMethods(countryCode: string): string[] {
  return getCountryConfig(countryCode)?.paymentMethods ?? ["wallet", "card"];
}
