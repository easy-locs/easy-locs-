import { useCallback, useMemo } from "react";

export type PaymentMethod =
  | "card" | "stripe" | "apple_pay" | "google_pay"
  | "wechat_pay" | "alipay" | "upi" | "pix" | "mercadopago"
  | "mobile_money" | "mtn_money" | "airtel_money" | "mpesa"
  | "ideal" | "bancontact" | "sepa" | "klarna" | "afterpay"
  | "cash_on_delivery" | "bank_transfer" | "crypto"
  | "paytm" | "phonepe" | "boleto" | "oxxo" | "giropay" | "eps"
  | "przelewy24" | "sofort" | "multibanco" | "paypal";

export type LegalFramework = "GDPR" | "CCPA" | "LGPD" | "PDPA" | "PIPL" | "POPIA" | "KVKK" | "DPDPA" | "NONE";
export type CurrencyCode = string;
export type CountryCode = string;

export interface TaxRule {
  standardRate: number;
  reducedRates?: Record<string, number>;
  digitalServicesRate?: number;
  name: string;
  registrationRequired?: boolean;
  invoiceRequired?: boolean;
}

export interface GlobalCountryConfig {
  code: CountryCode;
  name: string;
  localName?: string;
  continent: "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";
  currency: CurrencyCode;
  currencySymbol: string;
  currencyDecimals: number;
  locale: string;
  languages: string[];
  defaultLanguage: string;
  timezone: string;
  timezones?: string[];
  callingCode: string;
  rtl: boolean;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "YYYY/MM/DD";
  paymentMethods: PaymentMethod[];
  tax: TaxRule;
  legalFrameworks: LegalFramework[];
  minimumAge: number;
  dpaRequired: boolean;
  dataResidency: "EU" | "US" | "APAC" | "LATAM" | "MEA" | "LOCAL";
  features: Record<string, boolean>;
  operationalStatus: "active" | "beta" | "planned" | "restricted";
  measurementSystem: "metric" | "imperial";
  drivingSide: "left" | "right";
}

export const GLOBAL_COUNTRY_REGISTRY: Record<CountryCode, GlobalCountryConfig> = {
  AE: {
    code: "AE", name: "United Arab Emirates", localName: "الإمارات العربية المتحدة",
    continent: "AS", currency: "AED", currencySymbol: "د.إ", currencyDecimals: 2,
    locale: "ar-AE", languages: ["ar", "en"], defaultLanguage: "ar",
    timezone: "Asia/Dubai", callingCode: "+971", rtl: true, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "cash_on_delivery"],
    tax: { standardRate: 0.05, name: "VAT", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "MEA",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, realEstate: true, commerce: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  FR: {
    code: "FR", name: "France", localName: "France",
    continent: "EU", currency: "EUR", currencySymbol: "€", currencyDecimals: 2,
    locale: "fr-FR", languages: ["fr"], defaultLanguage: "fr",
    timezone: "Europe/Paris", callingCode: "+33", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "sepa", "klarna", "paypal"],
    tax: { standardRate: 0.20, reducedRates: { food: 0.055, books: 0.055, transport: 0.10 }, name: "TVA", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["GDPR"], minimumAge: 16, dpaRequired: true, dataResidency: "EU",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, realEstate: true, commerce: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  US: {
    code: "US", name: "United States",
    continent: "NA", currency: "USD", currencySymbol: "$", currencyDecimals: 2,
    locale: "en-US", languages: ["en", "es"], defaultLanguage: "en",
    timezone: "America/New_York", timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Pacific/Honolulu", "America/Anchorage"],
    callingCode: "+1", rtl: false, dateFormat: "MM/DD/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "paypal"],
    tax: { standardRate: 0, name: "Sales Tax" },
    legalFrameworks: ["CCPA"], minimumAge: 13, dpaRequired: false, dataResidency: "US",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, realEstate: true, commerce: true },
    operationalStatus: "active", measurementSystem: "imperial", drivingSide: "right",
  },
  GB: {
    code: "GB", name: "United Kingdom",
    continent: "EU", currency: "GBP", currencySymbol: "£", currencyDecimals: 2,
    locale: "en-GB", languages: ["en"], defaultLanguage: "en",
    timezone: "Europe/London", callingCode: "+44", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "klarna", "paypal"],
    tax: { standardRate: 0.20, reducedRates: { food: 0, children_clothing: 0 }, name: "VAT", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["GDPR"], minimumAge: 13, dpaRequired: true, dataResidency: "EU",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, realEstate: true, commerce: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "left",
  },
  DE: {
    code: "DE", name: "Germany", localName: "Deutschland",
    continent: "EU", currency: "EUR", currencySymbol: "€", currencyDecimals: 2,
    locale: "de-DE", languages: ["de"], defaultLanguage: "de",
    timezone: "Europe/Berlin", callingCode: "+49", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "sepa", "klarna", "giropay", "sofort", "paypal"],
    tax: { standardRate: 0.19, reducedRates: { food: 0.07, books: 0.07 }, name: "MwSt", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["GDPR"], minimumAge: 16, dpaRequired: true, dataResidency: "EU",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, realEstate: true, commerce: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  IN: {
    code: "IN", name: "India", localName: "भारत",
    continent: "AS", currency: "INR", currencySymbol: "₹", currencyDecimals: 2,
    locale: "hi-IN", languages: ["hi", "en"], defaultLanguage: "hi",
    timezone: "Asia/Kolkata", callingCode: "+91", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "upi", "paytm", "phonepe", "google_pay", "cash_on_delivery", "bank_transfer"],
    tax: { standardRate: 0.18, reducedRates: { food: 0.05, essential: 0 }, name: "GST", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["DPDPA"], minimumAge: 18, dpaRequired: false, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, realEstate: true, commerce: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "left",
  },
  BR: {
    code: "BR", name: "Brazil", localName: "Brasil",
    continent: "SA", currency: "BRL", currencySymbol: "R$", currencyDecimals: 2,
    locale: "pt-BR", languages: ["pt"], defaultLanguage: "pt",
    timezone: "America/Sao_Paulo", timezones: ["America/Sao_Paulo", "America/Manaus", "America/Bahia", "America/Recife"],
    callingCode: "+55", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "pix", "boleto", "mercadopago", "stripe", "apple_pay", "google_pay"],
    tax: { standardRate: 0.17, reducedRates: { food: 0.07 }, name: "ICMS", registrationRequired: true },
    legalFrameworks: ["LGPD"], minimumAge: 18, dpaRequired: true, dataResidency: "LATAM",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, realEstate: true, commerce: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  CN: {
    code: "CN", name: "China", localName: "中国",
    continent: "AS", currency: "CNY", currencySymbol: "¥", currencyDecimals: 2,
    locale: "zh-CN", languages: ["zh"], defaultLanguage: "zh",
    timezone: "Asia/Shanghai", callingCode: "+86", rtl: false, dateFormat: "YYYY-MM-DD",
    paymentMethods: ["wechat_pay", "alipay", "card", "bank_transfer"],
    tax: { standardRate: 0.13, reducedRates: { food: 0.09, services: 0.06 }, name: "VAT", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["PIPL"], minimumAge: 14, dpaRequired: true, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: false },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "right",
  },
  SG: {
    code: "SG", name: "Singapore",
    continent: "AS", currency: "SGD", currencySymbol: "S$", currencyDecimals: 2,
    locale: "en-SG", languages: ["en", "zh", "ms"], defaultLanguage: "en",
    timezone: "Asia/Singapore", callingCode: "+65", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "paypal", "bank_transfer"],
    tax: { standardRate: 0.09, name: "GST", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["PDPA"], minimumAge: 13, dpaRequired: true, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "left",
  },
  TH: {
    code: "TH", name: "Thailand", localName: "ประเทศไทย",
    continent: "AS", currency: "THB", currencySymbol: "฿", currencyDecimals: 2,
    locale: "th-TH", languages: ["th", "en"], defaultLanguage: "th",
    timezone: "Asia/Bangkok", callingCode: "+66", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "bank_transfer", "cash_on_delivery"],
    tax: { standardRate: 0.07, name: "VAT", registrationRequired: true },
    legalFrameworks: ["PDPA"], minimumAge: 20, dpaRequired: true, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "left",
  },
  NG: {
    code: "NG", name: "Nigeria",
    continent: "AF", currency: "NGN", currencySymbol: "₦", currencyDecimals: 2,
    locale: "en-NG", languages: ["en", "sw"], defaultLanguage: "en",
    timezone: "Africa/Lagos", callingCode: "+234", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "mobile_money", "mtn_money", "airtel_money", "bank_transfer", "cash_on_delivery"],
    tax: { standardRate: 0.075, name: "VAT", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "MEA",
    features: { taxi: true, delivery: true, food: true, commerce: true, wallet: true, hotel: false, realEstate: false },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  KE: {
    code: "KE", name: "Kenya",
    continent: "AF", currency: "KES", currencySymbol: "KSh", currencyDecimals: 2,
    locale: "sw-KE", languages: ["sw", "en"], defaultLanguage: "sw",
    timezone: "Africa/Nairobi", callingCode: "+254", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["mpesa", "card", "mobile_money", "airtel_money", "cash_on_delivery"],
    tax: { standardRate: 0.16, name: "VAT", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "MEA",
    features: { taxi: true, delivery: true, food: true, commerce: true, wallet: true, hotel: true, realEstate: false },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "left",
  },
  SA: {
    code: "SA", name: "Saudi Arabia", localName: "المملكة العربية السعودية",
    continent: "AS", currency: "SAR", currencySymbol: "﷼", currencyDecimals: 2,
    locale: "ar-SA", languages: ["ar", "en"], defaultLanguage: "ar",
    timezone: "Asia/Riyadh", callingCode: "+966", rtl: true, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "cash_on_delivery", "bank_transfer"],
    tax: { standardRate: 0.15, name: "VAT", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "MEA",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  JP: {
    code: "JP", name: "Japan", localName: "日本",
    continent: "AS", currency: "JPY", currencySymbol: "¥", currencyDecimals: 0,
    locale: "ja-JP", languages: ["ja"], defaultLanguage: "ja",
    timezone: "Asia/Tokyo", callingCode: "+81", rtl: false, dateFormat: "YYYY/MM/DD",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "bank_transfer", "paypal"],
    tax: { standardRate: 0.10, reducedRates: { food: 0.08 }, name: "Consumption Tax", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "left",
  },
  TR: {
    code: "TR", name: "Turkey", localName: "Türkiye",
    continent: "AS", currency: "TRY", currencySymbol: "₺", currencyDecimals: 2,
    locale: "tr-TR", languages: ["tr"], defaultLanguage: "tr",
    timezone: "Europe/Istanbul", callingCode: "+90", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "bank_transfer", "cash_on_delivery"],
    tax: { standardRate: 0.20, reducedRates: { food: 0.08 }, name: "KDV", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["KVKK"], minimumAge: 18, dpaRequired: true, dataResidency: "EU",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  MX: {
    code: "MX", name: "Mexico", localName: "México",
    continent: "NA", currency: "MXN", currencySymbol: "MX$", currencyDecimals: 2,
    locale: "es-MX", languages: ["es"], defaultLanguage: "es",
    timezone: "America/Mexico_City", timezones: ["America/Mexico_City", "America/Cancun", "America/Tijuana"],
    callingCode: "+52", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "oxxo", "mercadopago", "apple_pay", "google_pay", "cash_on_delivery"],
    tax: { standardRate: 0.16, name: "IVA", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "LATAM",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  ZA: {
    code: "ZA", name: "South Africa",
    continent: "AF", currency: "ZAR", currencySymbol: "R", currencyDecimals: 2,
    locale: "en-ZA", languages: ["en"], defaultLanguage: "en",
    timezone: "Africa/Johannesburg", callingCode: "+27", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "bank_transfer", "cash_on_delivery"],
    tax: { standardRate: 0.15, name: "VAT", registrationRequired: true },
    legalFrameworks: ["POPIA"], minimumAge: 18, dpaRequired: true, dataResidency: "MEA",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "left",
  },
  EG: {
    code: "EG", name: "Egypt", localName: "مصر",
    continent: "AF", currency: "EGP", currencySymbol: "E£", currencyDecimals: 2,
    locale: "ar-EG", languages: ["ar", "en"], defaultLanguage: "ar",
    timezone: "Africa/Cairo", callingCode: "+20", rtl: true, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "cash_on_delivery", "mobile_money", "bank_transfer"],
    tax: { standardRate: 0.14, name: "VAT", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "MEA",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  NL: {
    code: "NL", name: "Netherlands", localName: "Nederland",
    continent: "EU", currency: "EUR", currencySymbol: "€", currencyDecimals: 2,
    locale: "nl-NL", languages: ["nl", "en"], defaultLanguage: "nl",
    timezone: "Europe/Amsterdam", callingCode: "+31", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "ideal", "apple_pay", "google_pay", "sepa", "klarna", "paypal", "bancontact"],
    tax: { standardRate: 0.21, reducedRates: { food: 0.09, books: 0.09 }, name: "BTW", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["GDPR"], minimumAge: 16, dpaRequired: true, dataResidency: "EU",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  ES: {
    code: "ES", name: "Spain", localName: "España",
    continent: "EU", currency: "EUR", currencySymbol: "€", currencyDecimals: 2,
    locale: "es-ES", languages: ["es"], defaultLanguage: "es",
    timezone: "Europe/Madrid", callingCode: "+34", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "sepa", "klarna", "paypal"],
    tax: { standardRate: 0.21, reducedRates: { food: 0.10, essential: 0.04 }, name: "IVA", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["GDPR"], minimumAge: 14, dpaRequired: true, dataResidency: "EU",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  IT: {
    code: "IT", name: "Italy", localName: "Italia",
    continent: "EU", currency: "EUR", currencySymbol: "€", currencyDecimals: 2,
    locale: "it-IT", languages: ["it"], defaultLanguage: "it",
    timezone: "Europe/Rome", callingCode: "+39", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "sepa", "klarna", "paypal"],
    tax: { standardRate: 0.22, reducedRates: { food: 0.10, essential: 0.04 }, name: "IVA", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["GDPR"], minimumAge: 14, dpaRequired: true, dataResidency: "EU",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  AU: {
    code: "AU", name: "Australia",
    continent: "OC", currency: "AUD", currencySymbol: "A$", currencyDecimals: 2,
    locale: "en-AU", languages: ["en"], defaultLanguage: "en",
    timezone: "Australia/Sydney", timezones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide"],
    callingCode: "+61", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "afterpay", "paypal"],
    tax: { standardRate: 0.10, name: "GST", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 13, dpaRequired: false, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "left",
  },
  CA: {
    code: "CA", name: "Canada",
    continent: "NA", currency: "CAD", currencySymbol: "CA$", currencyDecimals: 2,
    locale: "en-CA", languages: ["en", "fr"], defaultLanguage: "en",
    timezone: "America/Toronto", timezones: ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Halifax"],
    callingCode: "+1", rtl: false, dateFormat: "YYYY-MM-DD",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "paypal"],
    tax: { standardRate: 0.05, name: "GST/HST", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 13, dpaRequired: false, dataResidency: "US",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  KR: {
    code: "KR", name: "South Korea", localName: "대한민국",
    continent: "AS", currency: "KRW", currencySymbol: "₩", currencyDecimals: 0,
    locale: "ko-KR", languages: ["ko"], defaultLanguage: "ko",
    timezone: "Asia/Seoul", callingCode: "+82", rtl: false, dateFormat: "YYYY-MM-DD",
    paymentMethods: ["card", "stripe", "apple_pay", "google_pay", "bank_transfer"],
    tax: { standardRate: 0.10, name: "VAT", registrationRequired: true, invoiceRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 14, dpaRequired: false, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "right",
  },
  MA: {
    code: "MA", name: "Morocco", localName: "المغرب",
    continent: "AF", currency: "MAD", currencySymbol: "MAD", currencyDecimals: 2,
    locale: "ar-MA", languages: ["ar", "fr"], defaultLanguage: "ar",
    timezone: "Africa/Casablanca", callingCode: "+212", rtl: true, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "cash_on_delivery", "bank_transfer"],
    tax: { standardRate: 0.20, reducedRates: { food: 0.07 }, name: "TVA", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "MEA",
    features: { taxi: true, delivery: true, food: true, hotel: true, wallet: true, commerce: true, realEstate: true },
    operationalStatus: "active", measurementSystem: "metric", drivingSide: "right",
  },
  PK: {
    code: "PK", name: "Pakistan", localName: "پاکستان",
    continent: "AS", currency: "PKR", currencySymbol: "₨", currencyDecimals: 2,
    locale: "ur-PK", languages: ["ur", "en"], defaultLanguage: "ur",
    timezone: "Asia/Karachi", callingCode: "+92", rtl: true, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "cash_on_delivery", "mobile_money", "bank_transfer"],
    tax: { standardRate: 0.17, name: "GST", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, commerce: true, wallet: true, hotel: false, realEstate: false },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "left",
  },
  PH: {
    code: "PH", name: "Philippines", localName: "Pilipinas",
    continent: "AS", currency: "PHP", currencySymbol: "₱", currencyDecimals: 2,
    locale: "en-PH", languages: ["en"], defaultLanguage: "en",
    timezone: "Asia/Manila", callingCode: "+63", rtl: false, dateFormat: "MM/DD/YYYY",
    paymentMethods: ["card", "cash_on_delivery", "mobile_money", "bank_transfer", "google_pay"],
    tax: { standardRate: 0.12, name: "VAT", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "APAC",
    features: { taxi: true, delivery: true, food: true, commerce: true, wallet: true, hotel: true, realEstate: false },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "right",
  },
  CO: {
    code: "CO", name: "Colombia",
    continent: "SA", currency: "COP", currencySymbol: "COL$", currencyDecimals: 0,
    locale: "es-CO", languages: ["es"], defaultLanguage: "es",
    timezone: "America/Bogota", callingCode: "+57", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "mercadopago", "cash_on_delivery", "bank_transfer"],
    tax: { standardRate: 0.19, name: "IVA", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "LATAM",
    features: { taxi: true, delivery: true, food: true, commerce: true, wallet: true, hotel: true, realEstate: false },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "right",
  },
  AR: {
    code: "AR", name: "Argentina",
    continent: "SA", currency: "ARS", currencySymbol: "AR$", currencyDecimals: 2,
    locale: "es-AR", languages: ["es"], defaultLanguage: "es",
    timezone: "America/Argentina/Buenos_Aires", callingCode: "+54", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "mercadopago", "cash_on_delivery", "bank_transfer"],
    tax: { standardRate: 0.21, name: "IVA", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "LATAM",
    features: { taxi: true, delivery: true, food: true, commerce: true, wallet: true, hotel: true, realEstate: true },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "right",
  },
  CL: {
    code: "CL", name: "Chile",
    continent: "SA", currency: "CLP", currencySymbol: "CLP$", currencyDecimals: 0,
    locale: "es-CL", languages: ["es"], defaultLanguage: "es",
    timezone: "America/Santiago", callingCode: "+56", rtl: false, dateFormat: "DD/MM/YYYY",
    paymentMethods: ["card", "mercadopago", "bank_transfer"],
    tax: { standardRate: 0.19, name: "IVA", registrationRequired: true },
    legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "LATAM",
    features: { taxi: true, delivery: true, food: true, commerce: true, wallet: true, hotel: true, realEstate: false },
    operationalStatus: "beta", measurementSystem: "metric", drivingSide: "right",
  },
};

export {
  getAllCountryEntries,
  getCountryEntry,
  getCountryEntryOrDefault,
  getCountryFlag,
  getLocalizedCountryName,
  getCountryLabelsMap,
  getAllCountryCodes,
  type CountryEntry,
} from "@/lib/global-country-registry";

const FALLBACK_CONFIG: GlobalCountryConfig = {
  code: "XX", name: "Unknown Country", continent: "EU",
  currency: "USD", currencySymbol: "$", currencyDecimals: 2,
  locale: "en", languages: ["en"], defaultLanguage: "en",
  timezone: "UTC", callingCode: "+0", rtl: false, dateFormat: "DD/MM/YYYY",
  paymentMethods: ["card", "stripe", "paypal"],
  tax: { standardRate: 0, name: "N/A" },
  legalFrameworks: ["NONE"], minimumAge: 18, dpaRequired: false, dataResidency: "US",
  features: { taxi: false, delivery: true, food: true, commerce: true, wallet: true, hotel: true, realEstate: true },
  operationalStatus: "planned", measurementSystem: "metric", drivingSide: "right",
};

export function getCountryConfig(code: CountryCode): GlobalCountryConfig {
  return GLOBAL_COUNTRY_REGISTRY[code.toUpperCase()] ?? { ...FALLBACK_CONFIG, code: code.toUpperCase() };
}

export function getCountryConfigOrNull(code: CountryCode): GlobalCountryConfig | null {
  return GLOBAL_COUNTRY_REGISTRY[code.toUpperCase()] ?? null;
}

export function isCountrySupported(code: CountryCode): boolean {
  return code.toUpperCase() in GLOBAL_COUNTRY_REGISTRY;
}

export function getAllCountries(): GlobalCountryConfig[] {
  return Object.values(GLOBAL_COUNTRY_REGISTRY);
}

export function getActiveCountries(): GlobalCountryConfig[] {
  return getAllCountries().filter((c) => c.operationalStatus === "active" || c.operationalStatus === "beta");
}

export function getCountriesWithFeature(feature: string): GlobalCountryConfig[] {
  return getAllCountries().filter((c) => c.features[feature] === true);
}

export function getCountriesByPaymentMethod(method: PaymentMethod): GlobalCountryConfig[] {
  return getAllCountries().filter((c) => c.paymentMethods.includes(method));
}

export function detectUserCountry(): CountryCode {
  try {
    const browserLocale = navigator.language || "";
    const parts = browserLocale.split("-");
    if (parts.length >= 2) {
      const cc = parts[parts.length - 1].toUpperCase();
      if (GLOBAL_COUNTRY_REGISTRY[cc]) return cc;
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      for (const config of Object.values(GLOBAL_COUNTRY_REGISTRY)) {
        if (config.timezone === tz || config.timezones?.includes(tz)) return config.code;
      }
    }
  } catch {}
  return "US";
}

export function detectUserLanguage(): string {
  try {
    const lang = navigator.language?.split("-")[0] || "en";
    const supported = new Set(Object.values(GLOBAL_COUNTRY_REGISTRY).flatMap((c) => c.languages));
    if (supported.has(lang)) return lang;
  } catch {}
  return "en";
}

export function getTaxRate(countryCode: CountryCode, category?: string): number {
  const config = getCountryConfig(countryCode);
  if (!config) return 0;
  if (category && config.tax.reducedRates?.[category] !== undefined) {
    return config.tax.reducedRates[category];
  }
  return config.tax.standardRate;
}

export function formatCurrencyByCountry(amount: number, countryCode: CountryCode): string {
  const config = getCountryConfig(countryCode);
  if (!config) return `${amount.toFixed(2)}`;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency", currency: config.currency,
      minimumFractionDigits: config.currencyDecimals,
      maximumFractionDigits: config.currencyDecimals,
    }).format(amount);
  } catch {
    return `${config.currencySymbol}${amount.toFixed(config.currencyDecimals)}`;
  }
}

export function isCountryRTL(countryCode: CountryCode): boolean {
  return getCountryConfig(countryCode)?.rtl ?? false;
}

export function useCountryConfig(overrideCountry?: CountryCode) {
  const country = useMemo(() => overrideCountry || detectUserCountry(), [overrideCountry]);
  const config = useMemo(() => getCountryConfig(country), [country]);

  const isFeatureEnabled = useCallback(
    (feature: string) => config?.features[feature] === true, [config],
  );

  const getPaymentMethods = useCallback(
    () => config?.paymentMethods ?? ["card"], [config],
  );

  const getLocalTaxRate = useCallback(
    (category?: string) => getTaxRate(country, category), [country],
  );

  const format = useMemo(() => ({
    currency: (amount: number) => formatCurrencyByCountry(amount, country),
    date: (date: Date) => {
      try {
        return new Intl.DateTimeFormat(config?.locale ?? "en", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
      } catch { return date.toLocaleDateString(); }
    },
  }), [country, config]);

  return {
    country, config, isFeatureEnabled, getPaymentMethods, getLocalTaxRate, format,
    isRTL: config?.rtl ?? false,
    language: config?.defaultLanguage ?? "en",
    currency: config?.currency ?? "USD",
    timezone: config?.timezone ?? "UTC",
    legalFrameworks: config?.legalFrameworks ?? [],
    minimumAge: config?.minimumAge ?? 18,
    dataResidency: config?.dataResidency ?? "US",
  };
}
