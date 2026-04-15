import type { LegalFramework, CountryCode } from "@/lib/country/global-country-config";
import { getCountryConfig } from "@/lib/country/global-country-config";

export type ConsentPurpose = "necessary" | "analytics" | "marketing" | "personalization" | "data_sale";
export type ConsentAction = "opt_in" | "opt_out" | "withdraw";

export interface RegionalConsentConfig {
  framework: LegalFramework;
  requiresExplicitConsent: boolean;
  rightToDelete: boolean;
  rightToExport: boolean;
  rightToOptOut: boolean;
  rightToCorrection: boolean;
  rightToRestriction: boolean;
  dataBreachNotificationHours: number;
  dpoRequired: boolean;
  crossBorderTransferRules: string;
  minimumAge: number;
  cookieBannerRequired: boolean;
  purposes: ConsentPurpose[];
}

export const COMPLIANCE_FRAMEWORKS: Record<LegalFramework, RegionalConsentConfig> = {
  GDPR: {
    framework: "GDPR",
    requiresExplicitConsent: true,
    rightToDelete: true,
    rightToExport: true,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: true,
    dataBreachNotificationHours: 72,
    dpoRequired: true,
    crossBorderTransferRules: "Adequacy decision or SCCs required",
    minimumAge: 16,
    cookieBannerRequired: true,
    purposes: ["necessary", "analytics", "marketing", "personalization"],
  },
  CCPA: {
    framework: "CCPA",
    requiresExplicitConsent: false,
    rightToDelete: true,
    rightToExport: true,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: false,
    dataBreachNotificationHours: 0,
    dpoRequired: false,
    crossBorderTransferRules: "No specific restrictions",
    minimumAge: 13,
    cookieBannerRequired: false,
    purposes: ["necessary", "analytics", "marketing", "data_sale"],
  },
  LGPD: {
    framework: "LGPD",
    requiresExplicitConsent: true,
    rightToDelete: true,
    rightToExport: true,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: true,
    dataBreachNotificationHours: 48,
    dpoRequired: true,
    crossBorderTransferRules: "Adequacy assessment or consent required",
    minimumAge: 18,
    cookieBannerRequired: true,
    purposes: ["necessary", "analytics", "marketing", "personalization"],
  },
  PDPA: {
    framework: "PDPA",
    requiresExplicitConsent: true,
    rightToDelete: true,
    rightToExport: true,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: false,
    dataBreachNotificationHours: 72,
    dpoRequired: true,
    crossBorderTransferRules: "Comparable protection required in receiving country",
    minimumAge: 13,
    cookieBannerRequired: true,
    purposes: ["necessary", "analytics", "marketing"],
  },
  PIPL: {
    framework: "PIPL",
    requiresExplicitConsent: true,
    rightToDelete: true,
    rightToExport: true,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: true,
    dataBreachNotificationHours: 24,
    dpoRequired: true,
    crossBorderTransferRules: "Security assessment or standard contract required",
    minimumAge: 14,
    cookieBannerRequired: true,
    purposes: ["necessary", "analytics", "marketing", "personalization"],
  },
  POPIA: {
    framework: "POPIA",
    requiresExplicitConsent: true,
    rightToDelete: true,
    rightToExport: true,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: false,
    dataBreachNotificationHours: 0,
    dpoRequired: true,
    crossBorderTransferRules: "Adequate protection required",
    minimumAge: 18,
    cookieBannerRequired: true,
    purposes: ["necessary", "analytics", "marketing"],
  },
  KVKK: {
    framework: "KVKK",
    requiresExplicitConsent: true,
    rightToDelete: true,
    rightToExport: true,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: false,
    dataBreachNotificationHours: 72,
    dpoRequired: true,
    crossBorderTransferRules: "Board approval required for transfers",
    minimumAge: 18,
    cookieBannerRequired: true,
    purposes: ["necessary", "analytics", "marketing"],
  },
  DPDPA: {
    framework: "DPDPA",
    requiresExplicitConsent: true,
    rightToDelete: true,
    rightToExport: false,
    rightToOptOut: true,
    rightToCorrection: true,
    rightToRestriction: false,
    dataBreachNotificationHours: 72,
    dpoRequired: false,
    crossBorderTransferRules: "Government-notified countries only",
    minimumAge: 18,
    cookieBannerRequired: false,
    purposes: ["necessary", "analytics", "marketing"],
  },
  NONE: {
    framework: "NONE",
    requiresExplicitConsent: false,
    rightToDelete: false,
    rightToExport: false,
    rightToOptOut: false,
    rightToCorrection: false,
    rightToRestriction: false,
    dataBreachNotificationHours: 0,
    dpoRequired: false,
    crossBorderTransferRules: "No specific regulations",
    minimumAge: 18,
    cookieBannerRequired: false,
    purposes: ["necessary"],
  },
};

export function getComplianceConfig(countryCode: CountryCode): RegionalConsentConfig {
  const country = getCountryConfig(countryCode);
  if (!country) return COMPLIANCE_FRAMEWORKS.NONE;

  const primary = country.legalFrameworks[0] ?? "NONE";
  return COMPLIANCE_FRAMEWORKS[primary] ?? COMPLIANCE_FRAMEWORKS.NONE;
}

export function requiresCookieBanner(countryCode: CountryCode): boolean {
  return getComplianceConfig(countryCode).cookieBannerRequired;
}

export function requiresExplicitConsent(countryCode: CountryCode): boolean {
  return getComplianceConfig(countryCode).requiresExplicitConsent;
}

export function getMinimumAge(countryCode: CountryCode): number {
  const country = getCountryConfig(countryCode);
  return country?.minimumAge ?? 18;
}

export function requiresDPA(countryCode: CountryCode): boolean {
  const country = getCountryConfig(countryCode);
  return country?.dpaRequired ?? false;
}

export function getDataResidencyLabel(countryCode: CountryCode): string {
  const country = getCountryConfig(countryCode);
  if (!country) return "Unknown";
  const labels: Record<string, string> = {
    EU: "European Union (Frankfurt, Germany)",
    US: "United States (Virginia, US)",
    APAC: "Asia-Pacific (Singapore)",
    LATAM: "Latin America (São Paulo, Brazil)",
    MEA: "Middle East & Africa (Bahrain)",
    LOCAL: "Local data center",
  };
  return labels[country.dataResidency] ?? "Unknown";
}

export interface ConsentRecord {
  userId: string;
  countryCode: CountryCode;
  framework: LegalFramework;
  purposes: Record<ConsentPurpose, boolean>;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  version: number;
}

export function createConsentRecord(
  userId: string,
  countryCode: CountryCode,
  consents: Record<ConsentPurpose, boolean>,
): ConsentRecord {
  const config = getComplianceConfig(countryCode);
  return {
    userId,
    countryCode,
    framework: config.framework,
    purposes: { necessary: true, ...consents },
    timestamp: new Date().toISOString(),
    ipAddress: "client-side",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
    version: 2,
  };
}

export function validateAgeRequirement(
  dateOfBirth: Date,
  countryCode: CountryCode,
): { valid: boolean; minimumAge: number; userAge: number } {
  const minAge = getMinimumAge(countryCode);
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return { valid: age >= minAge, minimumAge: minAge, userAge: age };
}

export interface DPASignature {
  merchantId: string;
  merchantName: string;
  signedAt: string;
  countryCode: CountryCode;
  framework: LegalFramework;
  version: string;
  ipAddress: string;
}

export function createDPASignature(
  merchantId: string,
  merchantName: string,
  countryCode: CountryCode,
): DPASignature {
  const config = getComplianceConfig(countryCode);
  return {
    merchantId,
    merchantName,
    signedAt: new Date().toISOString(),
    countryCode,
    framework: config.framework,
    version: "1.0",
    ipAddress: "client-side",
  };
}

export function getUserRights(countryCode: CountryCode): string[] {
  const config = getComplianceConfig(countryCode);
  const rights: string[] = [];
  if (config.rightToDelete) rights.push("right_to_delete");
  if (config.rightToExport) rights.push("right_to_export");
  if (config.rightToOptOut) rights.push("right_to_opt_out");
  if (config.rightToCorrection) rights.push("right_to_correction");
  if (config.rightToRestriction) rights.push("right_to_restriction");
  return rights;
}
