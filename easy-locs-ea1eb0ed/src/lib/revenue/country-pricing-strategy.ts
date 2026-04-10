import type { CountryPricingConfig, MarketTier } from "@/domains/revenue/revenue-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";

const COUNTRY_CONFIGS: Record<string, CountryPricingConfig> = {
  AE: { country: "AE", countryName: "United Arab Emirates", currency: "AED", marketTier: "premium", purchasingPowerIndex: 1.2, commissionAdjustment: 1.0, feeAdjustment: 1.1, minTransactionAmount: 5, taxRate: 0.05, paymentProcessingRate: 0.029, currencyConversionSpread: 0.02, topupFeePercent: 0.015, withdrawalFeePercent: 0.01 },
  US: { country: "US", countryName: "United States", currency: "USD", marketTier: "premium", purchasingPowerIndex: 1.0, commissionAdjustment: 1.0, feeAdjustment: 1.0, minTransactionAmount: 5, taxRate: 0, paymentProcessingRate: 0.029, currencyConversionSpread: 0.02, topupFeePercent: 0.02, withdrawalFeePercent: 0.01 },
  GB: { country: "GB", countryName: "United Kingdom", currency: "GBP", marketTier: "premium", purchasingPowerIndex: 1.05, commissionAdjustment: 1.0, feeAdjustment: 1.05, minTransactionAmount: 4, taxRate: 0.20, paymentProcessingRate: 0.025, currencyConversionSpread: 0.02, topupFeePercent: 0.015, withdrawalFeePercent: 0.01 },
  FR: { country: "FR", countryName: "France", currency: "EUR", marketTier: "mature", purchasingPowerIndex: 0.95, commissionAdjustment: 0.95, feeAdjustment: 0.95, minTransactionAmount: 3, taxRate: 0.20, paymentProcessingRate: 0.025, currencyConversionSpread: 0.02, topupFeePercent: 0.015, withdrawalFeePercent: 0.01 },
  DE: { country: "DE", countryName: "Germany", currency: "EUR", marketTier: "mature", purchasingPowerIndex: 1.0, commissionAdjustment: 0.95, feeAdjustment: 1.0, minTransactionAmount: 3, taxRate: 0.19, paymentProcessingRate: 0.025, currencyConversionSpread: 0.02, topupFeePercent: 0.015, withdrawalFeePercent: 0.01 },
  SA: { country: "SA", countryName: "Saudi Arabia", currency: "SAR", marketTier: "premium", purchasingPowerIndex: 1.1, commissionAdjustment: 1.0, feeAdjustment: 1.05, minTransactionAmount: 10, taxRate: 0.15, paymentProcessingRate: 0.030, currencyConversionSpread: 0.025, topupFeePercent: 0.02, withdrawalFeePercent: 0.015 },
  MA: { country: "MA", countryName: "Morocco", currency: "MAD", marketTier: "developing", purchasingPowerIndex: 0.35, commissionAdjustment: 0.70, feeAdjustment: 0.50, minTransactionAmount: 5, taxRate: 0.20, paymentProcessingRate: 0.035, currencyConversionSpread: 0.03, topupFeePercent: 0.025, withdrawalFeePercent: 0.02 },
  EG: { country: "EG", countryName: "Egypt", currency: "EGP", marketTier: "developing", purchasingPowerIndex: 0.25, commissionAdjustment: 0.65, feeAdjustment: 0.40, minTransactionAmount: 10, taxRate: 0.14, paymentProcessingRate: 0.035, currencyConversionSpread: 0.035, topupFeePercent: 0.025, withdrawalFeePercent: 0.02 },
  TN: { country: "TN", countryName: "Tunisia", currency: "TND", marketTier: "developing", purchasingPowerIndex: 0.30, commissionAdjustment: 0.65, feeAdjustment: 0.45, minTransactionAmount: 3, taxRate: 0.19, paymentProcessingRate: 0.035, currencyConversionSpread: 0.03, topupFeePercent: 0.025, withdrawalFeePercent: 0.02 },
  IN: { country: "IN", countryName: "India", currency: "INR", marketTier: "emerging", purchasingPowerIndex: 0.20, commissionAdjustment: 0.55, feeAdjustment: 0.30, minTransactionAmount: 50, taxRate: 0.18, paymentProcessingRate: 0.020, currencyConversionSpread: 0.03, topupFeePercent: 0.02, withdrawalFeePercent: 0.015 },
  TR: { country: "TR", countryName: "Turkey", currency: "TRY", marketTier: "developing", purchasingPowerIndex: 0.30, commissionAdjustment: 0.65, feeAdjustment: 0.45, minTransactionAmount: 20, taxRate: 0.18, paymentProcessingRate: 0.030, currencyConversionSpread: 0.03, topupFeePercent: 0.02, withdrawalFeePercent: 0.015 },
  SN: { country: "SN", countryName: "Senegal", currency: "XOF", marketTier: "emerging", purchasingPowerIndex: 0.18, commissionAdjustment: 0.50, feeAdjustment: 0.30, minTransactionAmount: 500, taxRate: 0.18, paymentProcessingRate: 0.040, currencyConversionSpread: 0.04, topupFeePercent: 0.03, withdrawalFeePercent: 0.025 },
  CM: { country: "CM", countryName: "Cameroon", currency: "XAF", marketTier: "emerging", purchasingPowerIndex: 0.18, commissionAdjustment: 0.50, feeAdjustment: 0.30, minTransactionAmount: 500, taxRate: 0.1925, paymentProcessingRate: 0.040, currencyConversionSpread: 0.04, topupFeePercent: 0.03, withdrawalFeePercent: 0.025 },
  NG: { country: "NG", countryName: "Nigeria", currency: "USD", marketTier: "emerging", purchasingPowerIndex: 0.15, commissionAdjustment: 0.50, feeAdjustment: 0.25, minTransactionAmount: 2, taxRate: 0.075, paymentProcessingRate: 0.035, currencyConversionSpread: 0.04, topupFeePercent: 0.03, withdrawalFeePercent: 0.025 },
  BR: { country: "BR", countryName: "Brazil", currency: "USD", marketTier: "developing", purchasingPowerIndex: 0.35, commissionAdjustment: 0.70, feeAdjustment: 0.50, minTransactionAmount: 3, taxRate: 0.12, paymentProcessingRate: 0.030, currencyConversionSpread: 0.03, topupFeePercent: 0.025, withdrawalFeePercent: 0.02 },
  MX: { country: "MX", countryName: "Mexico", currency: "USD", marketTier: "developing", purchasingPowerIndex: 0.35, commissionAdjustment: 0.70, feeAdjustment: 0.50, minTransactionAmount: 3, taxRate: 0.16, paymentProcessingRate: 0.030, currencyConversionSpread: 0.03, topupFeePercent: 0.025, withdrawalFeePercent: 0.02 },
  JP: { country: "JP", countryName: "Japan", currency: "USD", marketTier: "premium", purchasingPowerIndex: 0.90, commissionAdjustment: 0.90, feeAdjustment: 0.90, minTransactionAmount: 5, taxRate: 0.10, paymentProcessingRate: 0.025, currencyConversionSpread: 0.02, topupFeePercent: 0.015, withdrawalFeePercent: 0.01 },
  KR: { country: "KR", countryName: "South Korea", currency: "USD", marketTier: "mature", purchasingPowerIndex: 0.85, commissionAdjustment: 0.90, feeAdjustment: 0.85, minTransactionAmount: 5, taxRate: 0.10, paymentProcessingRate: 0.025, currencyConversionSpread: 0.02, topupFeePercent: 0.015, withdrawalFeePercent: 0.01 },
  ID: { country: "ID", countryName: "Indonesia", currency: "USD", marketTier: "emerging", purchasingPowerIndex: 0.20, commissionAdjustment: 0.55, feeAdjustment: 0.30, minTransactionAmount: 2, taxRate: 0.11, paymentProcessingRate: 0.030, currencyConversionSpread: 0.035, topupFeePercent: 0.025, withdrawalFeePercent: 0.02 },
  PH: { country: "PH", countryName: "Philippines", currency: "USD", marketTier: "emerging", purchasingPowerIndex: 0.20, commissionAdjustment: 0.55, feeAdjustment: 0.30, minTransactionAmount: 2, taxRate: 0.12, paymentProcessingRate: 0.030, currencyConversionSpread: 0.035, topupFeePercent: 0.025, withdrawalFeePercent: 0.02 },
};

const DEFAULT_CONFIG: CountryPricingConfig = {
  country: "XX",
  countryName: "Default",
  currency: "EUR",
  marketTier: "developing",
  purchasingPowerIndex: 0.50,
  commissionAdjustment: 0.75,
  feeAdjustment: 0.60,
  minTransactionAmount: 3,
  taxRate: 0.15,
  paymentProcessingRate: 0.030,
  currencyConversionSpread: 0.03,
  topupFeePercent: 0.025,
  withdrawalFeePercent: 0.02,
};

export function getCountryConfig(countryCode: string): CountryPricingConfig {
  return COUNTRY_CONFIGS[countryCode.toUpperCase()] ?? { ...DEFAULT_CONFIG, country: countryCode.toUpperCase() };
}

export function getAllCountryConfigs(): CountryPricingConfig[] {
  return Object.values(COUNTRY_CONFIGS);
}

export function getCountriesByMarketTier(tier: MarketTier): CountryPricingConfig[] {
  return Object.values(COUNTRY_CONFIGS).filter(c => c.marketTier === tier);
}

export function adjustPriceForCountry(
  basePrice: number,
  baseCurrency: CurrencyCode,
  targetCountry: string,
): { adjustedPrice: number; currency: CurrencyCode; adjustment: number } {
  const cfg = getCountryConfig(targetCountry);
  const adjustment = cfg.purchasingPowerIndex;
  return {
    adjustedPrice: Math.round(basePrice * adjustment * 100) / 100,
    currency: cfg.currency,
    adjustment,
  };
}

export function computeTaxAmount(amount: number, country: string): { tax: number; rate: number } {
  const cfg = getCountryConfig(country);
  return {
    tax: Math.round(amount * cfg.taxRate * 100) / 100,
    rate: cfg.taxRate,
  };
}

export function getPaymentProcessingCost(amount: number, country: string): number {
  const cfg = getCountryConfig(country);
  return Math.round(amount * cfg.paymentProcessingRate * 100) / 100;
}
