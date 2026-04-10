import { type TrustLevel, TRUST_LEVELS, type SecurityFlag, SECURITY_FLAG_CONFIGS } from "./trust-levels";

export interface CountryLimitConfig {
  countryCode: string;
  currency: string;
  dailySendMultiplier: number;
  dailyReceiveMultiplier: number;
  weeklySendMultiplier: number;
  singleTxMultiplier: number;
  topUpMultiplier: number;
  kycRequiredFromLevel: TrustLevel;
  additionalRestrictions: string[];
}

const COUNTRY_CONFIGS: Record<string, CountryLimitConfig> = {
  US: { countryCode: "US", currency: "USD", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 3, additionalRestrictions: [] },
  GB: { countryCode: "GB", currency: "GBP", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 3, additionalRestrictions: [] },
  FR: { countryCode: "FR", currency: "EUR", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 2, additionalRestrictions: [] },
  DE: { countryCode: "DE", currency: "EUR", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 2, additionalRestrictions: [] },
  NG: { countryCode: "NG", currency: "NGN", dailySendMultiplier: 0.5, dailyReceiveMultiplier: 0.5, weeklySendMultiplier: 0.5, singleTxMultiplier: 0.5, topUpMultiplier: 0.5, kycRequiredFromLevel: 1, additionalRestrictions: ["enhanced_monitoring"] },
  KE: { countryCode: "KE", currency: "KES", dailySendMultiplier: 0.6, dailyReceiveMultiplier: 0.6, weeklySendMultiplier: 0.6, singleTxMultiplier: 0.6, topUpMultiplier: 0.6, kycRequiredFromLevel: 1, additionalRestrictions: ["enhanced_monitoring"] },
  IN: { countryCode: "IN", currency: "INR", dailySendMultiplier: 0.8, dailyReceiveMultiplier: 0.8, weeklySendMultiplier: 0.8, singleTxMultiplier: 0.8, topUpMultiplier: 0.8, kycRequiredFromLevel: 2, additionalRestrictions: [] },
  AE: { countryCode: "AE", currency: "AED", dailySendMultiplier: 1.2, dailyReceiveMultiplier: 1.2, weeklySendMultiplier: 1.2, singleTxMultiplier: 1.2, topUpMultiplier: 1.2, kycRequiredFromLevel: 3, additionalRestrictions: [] },
  SA: { countryCode: "SA", currency: "SAR", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 2, additionalRestrictions: [] },
  BR: { countryCode: "BR", currency: "BRL", dailySendMultiplier: 0.7, dailyReceiveMultiplier: 0.7, weeklySendMultiplier: 0.7, singleTxMultiplier: 0.7, topUpMultiplier: 0.7, kycRequiredFromLevel: 2, additionalRestrictions: [] },
  JP: { countryCode: "JP", currency: "JPY", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 3, additionalRestrictions: [] },
  CA: { countryCode: "CA", currency: "CAD", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 3, additionalRestrictions: [] },
  AU: { countryCode: "AU", currency: "AUD", dailySendMultiplier: 1.0, dailyReceiveMultiplier: 1.0, weeklySendMultiplier: 1.0, singleTxMultiplier: 1.0, topUpMultiplier: 1.0, kycRequiredFromLevel: 3, additionalRestrictions: [] },
};

const DEFAULT_COUNTRY_CONFIG: CountryLimitConfig = {
  countryCode: "DEFAULT",
  currency: "USD",
  dailySendMultiplier: 0.7,
  dailyReceiveMultiplier: 0.7,
  weeklySendMultiplier: 0.7,
  singleTxMultiplier: 0.7,
  topUpMultiplier: 0.7,
  kycRequiredFromLevel: 2,
  additionalRestrictions: ["enhanced_monitoring"],
};

export function getCountryConfig(countryCode: string): CountryLimitConfig {
  return COUNTRY_CONFIGS[countryCode.toUpperCase()] || DEFAULT_COUNTRY_CONFIG;
}

export interface ResolvedLimits {
  dailySend: number;
  dailyReceive: number;
  weeklySend: number;
  singleTx: number;
  topUp: number;
  largeTxThreshold: number;
  kycRequired: boolean;
  countryRestrictions: string[];
}

export function resolveEffectiveLimits(
  trustLevel: TrustLevel,
  securityFlag: SecurityFlag,
  countryCode: string
): ResolvedLimits {
  const levelConfig = TRUST_LEVELS[trustLevel];
  const flagConfig = SECURITY_FLAG_CONFIGS[securityFlag];
  const countryConfig = getCountryConfig(countryCode);
  const fm = flagConfig.limitMultiplier;

  return {
    dailySend: Math.round(levelConfig.dailySendLimit * fm * countryConfig.dailySendMultiplier),
    dailyReceive: Math.round(levelConfig.dailyReceiveLimit * fm * countryConfig.dailyReceiveMultiplier),
    weeklySend: Math.round(levelConfig.weeklySendLimit * fm * countryConfig.weeklySendMultiplier),
    singleTx: Math.round(levelConfig.singleTxLimit * fm * countryConfig.singleTxMultiplier),
    topUp: Math.round(levelConfig.topUpLimit * fm * countryConfig.topUpMultiplier),
    largeTxThreshold: Math.round(levelConfig.largeTxThreshold * fm),
    kycRequired: trustLevel >= countryConfig.kycRequiredFromLevel || flagConfig.requireKyc,
    countryRestrictions: countryConfig.additionalRestrictions,
  };
}

export function isCountrySupported(countryCode: string): boolean {
  return countryCode.toUpperCase() in COUNTRY_CONFIGS;
}

export function getSupportedCountries(): string[] {
  return Object.keys(COUNTRY_CONFIGS);
}

export function requiresEnhancedMonitoring(countryCode: string): boolean {
  const config = getCountryConfig(countryCode);
  return config.additionalRestrictions.includes("enhanced_monitoring");
}
