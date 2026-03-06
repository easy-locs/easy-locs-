/**
 * CountryProfile — Unified strict model for country-based property isolation.
 * Every property operates inside a single CountryProfile that governs:
 * - Currency & formatting
 * - Tax & accounting rules
 * - Lease & compliance rules
 * - Document templates
 * - Timezone & languages
 * - Payment methods
 *
 * NO cross-country logic is allowed. A French property uses only French rules.
 */

import { getCountryEntry, getCountryEntryOrDefault, type CountryEntry } from "@/lib/global-country-registry";
import { getAccountingRules, type CountryAccountingRules } from "@/lib/accounting-rules";
import { getCountryConfig, type CountryConfig } from "@/lib/country-config";
import { getCountryModule, type CountryModule, type CountryLegalRules } from "@/lib/templates/country-module";
import { getTenantLabels, type TenantLabels } from "@/lib/tenant-i18n";
import { getTemplatesByCountry } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";

// ─── Payment method definitions ───

export type PaymentMethod = "card" | "sepa_direct_debit" | "sepa_transfer" | "bank_transfer" | "cheque" | "cash" | "apple_pay" | "google_pay" | "paypal";

const SEPA_COUNTRIES = new Set([
  "FR", "DE", "ES", "IT", "PT", "NL", "BE", "AT", "CH", "LU", "IE", "FI",
  "GR", "SK", "SI", "LT", "LV", "EE", "CY", "MT", "HR", "BG", "RO",
  "CZ", "HU", "PL", "SE", "DK", "NO", "IS", "GB",
]);

function getPaymentMethods(countryCode: string): PaymentMethod[] {
  const base: PaymentMethod[] = ["card", "bank_transfer", "cash"];
  if (SEPA_COUNTRIES.has(countryCode)) {
    base.push("sepa_direct_debit", "sepa_transfer");
  }
  // Digital wallets available everywhere Stripe operates
  base.push("apple_pay", "google_pay");
  return base;
}

// ─── Compliance ruleset ───

export interface ComplianceRuleset {
  energyCertificateRequired: boolean;
  depositRegistrationRequired: boolean;
  inventoryMandatory: boolean;
  rentControlApplicable: boolean;
  guarantorStandard: boolean;
  requiredAnnexes: string[];
  tenantInsuranceRequired: boolean;
}

function getComplianceRules(countryCode: string): ComplianceRuleset {
  const mod = getCountryModule(countryCode);
  const rules = mod?.rules;

  // Country-specific overrides
  const overrides: Partial<Record<string, Partial<ComplianceRuleset>>> = {
    FR: { energyCertificateRequired: true, depositRegistrationRequired: false, inventoryMandatory: true, rentControlApplicable: true, guarantorStandard: true, tenantInsuranceRequired: true, requiredAnnexes: rules?.requiredAnnexes || [] },
    DE: { energyCertificateRequired: true, depositRegistrationRequired: true, inventoryMandatory: false, rentControlApplicable: true, guarantorStandard: false, tenantInsuranceRequired: false },
    AE: { energyCertificateRequired: false, depositRegistrationRequired: false, inventoryMandatory: false, rentControlApplicable: true, guarantorStandard: false, tenantInsuranceRequired: false },
    GB: { energyCertificateRequired: true, depositRegistrationRequired: true, inventoryMandatory: true, rentControlApplicable: false, guarantorStandard: false, tenantInsuranceRequired: false },
    ES: { energyCertificateRequired: true, depositRegistrationRequired: true, inventoryMandatory: false, rentControlApplicable: true, guarantorStandard: false, tenantInsuranceRequired: false },
    IT: { energyCertificateRequired: true, depositRegistrationRequired: false, inventoryMandatory: false, rentControlApplicable: false, guarantorStandard: false, tenantInsuranceRequired: false },
  };

  const base: ComplianceRuleset = {
    energyCertificateRequired: rules?.energyCertificateRequired ?? false,
    depositRegistrationRequired: false,
    inventoryMandatory: false,
    rentControlApplicable: false,
    guarantorStandard: rules?.guarantorStandard ?? false,
    requiredAnnexes: rules?.requiredAnnexes || [],
    tenantInsuranceRequired: false,
  };

  return { ...base, ...(overrides[countryCode] || {}) };
}

// ─── Lease ruleset ───

export interface LeaseRuleset {
  minDuration: Record<string, number>;
  noticePeriod: Record<string, number>;
  depositCap: Record<string, number>;
  rentIndexMethod: string;
  chargesRegularizationRequired: boolean;
}

function getLeaseRules(countryCode: string): LeaseRuleset {
  const mod = getCountryModule(countryCode);
  const rules = mod?.rules;
  return {
    minDuration: rules?.minLeaseDuration || {},
    noticePeriod: rules?.noticePeriod || {},
    depositCap: rules?.depositCap || {},
    rentIndexMethod: rules?.rentIndexMethod || "CPI",
    chargesRegularizationRequired: rules?.chargesRegularizationRequired ?? false,
  };
}

// ─── CountryProfile: the unified model ───

export interface CountryProfile {
  /** ISO country code */
  code: string;
  /** Human-readable name */
  name: string;
  /** Flag emoji */
  flag: string;
  /** Primary currency code (e.g. "EUR", "AED") */
  currency: string;
  /** Currency display symbol */
  currencySymbol: string;
  /** Intl locale string */
  locale: string;
  /** IANA timezone */
  timezone: string;
  /** Date display format */
  dateFormat: string;
  /** Measurement system */
  measurementUnit: "metric" | "imperial";
  /** Default language for this jurisdiction */
  defaultLanguage: string;
  /** Languages available for tenants in this jurisdiction */
  tenantLanguages: string[];
  /** Tax & accounting rules */
  accounting: CountryAccountingRules;
  /** Lease-specific rules */
  lease: LeaseRuleset;
  /** Compliance & regulatory rules */
  compliance: ComplianceRuleset;
  /** Allowed payment methods */
  paymentMethods: PaymentMethod[];
  /** Available document templates */
  getTemplates: () => DocumentTemplate[];
  /** UI labels (country-config) */
  uiConfig: CountryConfig;
  /** Tenant-specific labels */
  tenantLabels: TenantLabels;
  /** Region classification */
  region: string;
  /** Tax ID label for this jurisdiction */
  taxIdLabel: string;
}

// ─── Profile builder ───

const profileCache = new Map<string, CountryProfile>();

export function getCountryProfile(countryCode: string): CountryProfile {
  const cached = profileCache.get(countryCode);
  if (cached) return cached;

  const entry = getCountryEntryOrDefault(countryCode);
  const accounting = getAccountingRules(countryCode);
  const uiConfig = getCountryConfig(countryCode);
  const tenantLabels = getTenantLabels(countryCode);

  const profile: CountryProfile = {
    code: entry.code,
    name: entry.name,
    flag: entry.flag,
    currency: entry.currency,
    currencySymbol: entry.currencySymbol,
    locale: entry.locale,
    timezone: entry.timezone,
    dateFormat: entry.dateFormat,
    measurementUnit: entry.measurementUnit,
    defaultLanguage: entry.defaultLanguage,
    tenantLanguages: entry.supportedLanguages,
    accounting,
    lease: getLeaseRules(countryCode),
    compliance: getComplianceRules(countryCode),
    paymentMethods: getPaymentMethods(countryCode),
    getTemplates: () => getTemplatesByCountry(countryCode),
    uiConfig,
    tenantLabels,
    region: entry.region,
    taxIdLabel: entry.taxIdLabel,
  };

  profileCache.set(countryCode, profile);
  return profile;
}

// ─── STRICT ISOLATION GUARDS ───

export class CountryIsolationError extends Error {
  constructor(
    public readonly propertyCountry: string,
    public readonly violatingCountry: string,
    public readonly operation: string,
  ) {
    super(
      `Country isolation violation: Cannot apply ${operation} from ${violatingCountry} to a property in ${propertyCountry}. ` +
      `Each property must use its own country's legal environment.`
    );
    this.name = "CountryIsolationError";
  }
}

/**
 * Assert that a template matches the property's country.
 * Throws CountryIsolationError if mismatched.
 */
export function assertTemplateCountryMatch(
  propertyCountry: string,
  template: DocumentTemplate,
): void {
  if (template.country !== propertyCountry) {
    throw new CountryIsolationError(
      propertyCountry,
      template.country,
      `template "${template.id}" (${template.country})`
    );
  }
}

/**
 * Assert that a currency matches the property's country currency.
 */
export function assertCurrencyMatch(
  propertyCountry: string,
  currency: string,
): void {
  const profile = getCountryProfile(propertyCountry);
  if (currency !== profile.currency) {
    throw new CountryIsolationError(
      propertyCountry,
      currency,
      `currency "${currency}" (expected ${profile.currency})`
    );
  }
}

/**
 * Assert that an accounting operation targets the correct country.
 */
export function assertAccountingCountryMatch(
  propertyCountry: string,
  transactionCountry: string,
): void {
  if (propertyCountry !== transactionCountry) {
    throw new CountryIsolationError(
      propertyCountry,
      transactionCountry,
      "accounting entry"
    );
  }
}

/**
 * Validate a lease against the property's country rules.
 * Returns error messages for any violations.
 */
export function validateLeaseForCountry(
  propertyCountry: string,
  leaseData: Record<string, unknown>,
): string[] {
  const profile = getCountryProfile(propertyCountry);
  const errors: string[] = [];

  // Check template country if provided
  if (leaseData.templateCountry && leaseData.templateCountry !== propertyCountry) {
    errors.push(`Cannot use a ${leaseData.templateCountry} lease template for a property in ${propertyCountry}.`);
  }

  // Check currency
  if (leaseData.currency && leaseData.currency !== profile.currency) {
    errors.push(`Currency mismatch: property in ${propertyCountry} must use ${profile.currency}, not ${leaseData.currency}.`);
  }

  // Check duration against country minimums
  const leaseType = String(leaseData.leaseType || "residential");
  const duration = Number(leaseData.duration || 0);
  const minDuration = profile.lease.minDuration[leaseType];
  if (minDuration && duration > 0 && duration < minDuration) {
    errors.push(`Minimum lease duration for ${leaseType} in ${propertyCountry}: ${minDuration} months.`);
  }

  // Check deposit cap
  const deposit = Number(leaseData.depositAmount || 0);
  const rent = Number(leaseData.rentAmount || 0);
  const cap = profile.lease.depositCap[leaseType];
  if (cap && rent > 0 && deposit > rent * cap) {
    errors.push(`Deposit exceeds maximum of ${cap} month(s) rent for ${propertyCountry}.`);
  }

  return errors;
}

/**
 * Filter templates strictly by property country.
 * Use this instead of manual filtering.
 */
export function getTemplatesForProperty(propertyCountry: string): DocumentTemplate[] {
  return getTemplatesByCountry(propertyCountry);
}

/**
 * Get accounting rules strictly for a property's country.
 */
export function getAccountingForProperty(propertyCountry: string): CountryAccountingRules {
  return getCountryProfile(propertyCountry).accounting;
}

/**
 * Format currency using the property's country profile.
 */
export function formatPropertyCurrency(amount: number, propertyCountry: string): string {
  const profile = getCountryProfile(propertyCountry);
  try {
    return new Intl.NumberFormat(profile.locale, {
      style: "currency",
      currency: profile.currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${profile.currencySymbol}`;
  }
}

/**
 * Get tenant languages available for a property's country.
 */
export function getTenantLanguagesForProperty(propertyCountry: string): string[] {
  return getCountryProfile(propertyCountry).tenantLanguages;
}
