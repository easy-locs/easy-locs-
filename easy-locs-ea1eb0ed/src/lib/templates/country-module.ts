/**
 * CountryModule — Legal engine architecture for multi-country document generation.
 * Each country registers its own module with rules, required fields, and generators.
 */

import type { Country, DocumentTemplate } from "./types";

/** Country-specific legal rules for lease/document generation */
export interface CountryLegalRules {
  /** Minimum lease duration in months (e.g., FR empty = 36, furnished = 12) */
  minLeaseDuration: Record<string, number>;
  /** Notice period in months by lease type */
  noticePeriod: Record<string, number>;
  /** Deposit cap as multiplier of monthly rent (e.g., FR empty = 1, furnished = 2) */
  depositCap: Record<string, number>;
  /** Rent indexation method (IRL, IPC, CPI, etc.) */
  rentIndexMethod: string;
  /** Whether charges regularization is mandatory */
  chargesRegularizationRequired: boolean;
  /** Whether a guarantor clause is standard */
  guarantorStandard: boolean;
  /** Required annexes by lease type */
  requiredAnnexes: string[];
  /** DPE/EPC energy certificate required */
  energyCertificateRequired: boolean;
}

/** A country module encapsulates everything needed for a specific jurisdiction */
export interface CountryModule {
  code: Country;
  name: string;
  locale: string;
  currency: string;
  currencySymbol: string;
  /** Legal rules for this jurisdiction */
  rules: CountryLegalRules;
  /** Templates registered for this country */
  getTemplates: () => DocumentTemplate[];
  /** Validate lease data against country rules, returns error messages */
  validateLease: (data: Record<string, unknown>) => string[];
  /** Date format for this locale (e.g., "dd/MM/yyyy") */
  dateFormat: string;
  /** Measurement unit ("metric" | "imperial") */
  measurementUnit: "metric" | "imperial";
}

// ─── Registry ───

const modules = new Map<Country, CountryModule>();

export function registerCountryModule(mod: CountryModule): void {
  modules.set(mod.code, mod);
}

export function getCountryModule(country: Country): CountryModule | undefined {
  return modules.get(country);
}

export function getAllCountryModules(): CountryModule[] {
  return Array.from(modules.values());
}

export function getRegisteredCountries(): Country[] {
  return Array.from(modules.keys());
}

// ─── Default France module ───

const frRules: CountryLegalRules = {
  minLeaseDuration: { empty: 36, furnished: 12, commercial: 108 },
  noticePeriod: { empty: 3, furnished: 1, commercial: 6 },
  depositCap: { empty: 1, furnished: 2, commercial: 3 },
  rentIndexMethod: "IRL",
  chargesRegularizationRequired: true,
  guarantorStandard: true,
  requiredAnnexes: [
    "DPE", "CREP (plomb)", "Amiante", "État parasitaire",
    "Risques naturels et technologiques", "Installation électrique",
    "Installation gaz", "Surface habitable (Loi Boutin)",
  ],
  energyCertificateRequired: true,
};

import { getTemplatesByCountry } from "./registry";

registerCountryModule({
  code: "FR",
  name: "France",
  locale: "fr-FR",
  currency: "EUR",
  currencySymbol: "€",
  rules: frRules,
  getTemplates: () => getTemplatesByCountry("FR"),
  validateLease: (data) => {
    const errors: string[] = [];
    const leaseType = String(data.leaseType || "empty");
    const duration = Number(data.duration || 0);
    const minDuration = frRules.minLeaseDuration[leaseType];
    if (minDuration && duration > 0 && duration < minDuration) {
      errors.push(`Durée minimale du bail ${leaseType} : ${minDuration} mois (Loi du 6 juillet 1989)`);
    }
    const deposit = Number(data.depositAmount || 0);
    const rent = Number(data.rentAmount || 0);
    const cap = frRules.depositCap[leaseType];
    if (cap && rent > 0 && deposit > rent * cap) {
      errors.push(`Le dépôt de garantie ne peut excéder ${cap} mois de loyer`);
    }
    return errors;
  },
  dateFormat: "dd/MM/yyyy",
  measurementUnit: "metric",
});

// ─── Pre-register common European modules ───

const europeDefaults: Partial<Record<Country, { name: string; locale: string; currency: string; symbol: string; indexMethod: string; minLease: Record<string, number>; notice: Record<string, number>; depositCap: Record<string, number> }>> = {
  DE: { name: "Deutschland", locale: "de-DE", currency: "EUR", symbol: "€", indexMethod: "Mietspiegel", minLease: { residential: 0 }, notice: { residential: 3 }, depositCap: { residential: 3 } },
  ES: { name: "España", locale: "es-ES", currency: "EUR", symbol: "€", indexMethod: "IPC", minLease: { residential: 60 }, notice: { residential: 4 }, depositCap: { residential: 2 } },
  IT: { name: "Italia", locale: "it-IT", currency: "EUR", symbol: "€", indexMethod: "ISTAT", minLease: { residential: 48 }, notice: { residential: 6 }, depositCap: { residential: 3 } },
  NL: { name: "Nederland", locale: "nl-NL", currency: "EUR", symbol: "€", indexMethod: "CPI", minLease: { residential: 24 }, notice: { residential: 3 }, depositCap: { residential: 3 } },
  BE: { name: "Belgique", locale: "fr-BE", currency: "EUR", symbol: "€", indexMethod: "Indice santé", minLease: { residential: 36 }, notice: { residential: 3 }, depositCap: { residential: 3 } },
  PT: { name: "Portugal", locale: "pt-PT", currency: "EUR", symbol: "€", indexMethod: "INE", minLease: { residential: 12 }, notice: { residential: 2 }, depositCap: { residential: 2 } },
  GB: { name: "United Kingdom", locale: "en-GB", currency: "GBP", symbol: "£", indexMethod: "CPI", minLease: { residential: 6 }, notice: { residential: 2 }, depositCap: { residential: 5 } },
  AT: { name: "Österreich", locale: "de-AT", currency: "EUR", symbol: "€", indexMethod: "VPI", minLease: { residential: 36 }, notice: { residential: 3 }, depositCap: { residential: 3 } },
  CH: { name: "Suisse", locale: "fr-CH", currency: "CHF", symbol: "CHF", indexMethod: "IPC", minLease: { residential: 12 }, notice: { residential: 3 }, depositCap: { residential: 3 } },
};

for (const [code, cfg] of Object.entries(europeDefaults)) {
  const c = code as Country;
  registerCountryModule({
    code: c,
    name: cfg!.name,
    locale: cfg!.locale,
    currency: cfg!.currency,
    currencySymbol: cfg!.symbol,
    rules: {
      minLeaseDuration: cfg!.minLease,
      noticePeriod: cfg!.notice,
      depositCap: cfg!.depositCap,
      rentIndexMethod: cfg!.indexMethod,
      chargesRegularizationRequired: false,
      guarantorStandard: false,
      requiredAnnexes: [],
      energyCertificateRequired: true,
    },
    getTemplates: () => getTemplatesByCountry(c),
    validateLease: (data) => {
      const errors: string[] = [];
      const leaseType = Object.keys(cfg!.minLease)[0] || "residential";
      const duration = Number(data.duration || 0);
      const min = cfg!.minLease[leaseType] || 0;
      if (min && duration > 0 && duration < min) {
        errors.push(`Minimum lease duration: ${min} months`);
      }
      return errors;
    },
    dateFormat: c === "GB" ? "dd/MM/yyyy" : "dd.MM.yyyy",
    measurementUnit: c === "GB" ? "imperial" : "metric",
  });
}
