import type { CurrencyCode } from "@/domains/shared/canonical-types";
import type { PropertyType, AreaUnit, DocumentType } from "./canonical-types";

export interface CountryPropertyRules {
  countryCode: string;
  countryName: string;
  currency: CurrencyCode;
  languages: string[];
  timezone: string;
  addressFormat: string[];
  phonePrefix: string;
  areaUnit: AreaUnit;
  allowedPropertyTypes: PropertyType[];
  requiredDocuments: DocumentType[];
  contractRules: {
    minLeaseDuration?: number;
    maxLeaseDuration?: number;
    depositMultiplier?: number;
    noticePeriodDays?: number;
    renewalPolicy?: "auto" | "manual" | "negotiated";
  };
  taxRules: {
    vatRate?: number;
    stampDuty?: number;
    registrationFee?: number;
    capitalGainsTax?: number;
    rentalIncomeTax?: number;
  };
  localLabels?: Record<string, string>;
  adminStructure: string[];
}

const DEFAULT_RESIDENTIAL_TYPES: PropertyType[] = [
  "studio", "apartment", "penthouse", "duplex", "townhouse",
  "villa", "compound_villa", "serviced_apartment",
];

const DEFAULT_COMMERCIAL_TYPES: PropertyType[] = [
  "office", "retail", "shop", "warehouse", "industrial_unit",
  "mixed_use", "commercial_building",
];

const DEFAULT_LAND_TYPES: PropertyType[] = [
  "residential_land", "commercial_land", "industrial_land", "agricultural_land",
];

const ALL_STANDARD_TYPES: PropertyType[] = [
  ...DEFAULT_RESIDENTIAL_TYPES,
  ...DEFAULT_COMMERCIAL_TYPES,
  ...DEFAULT_LAND_TYPES,
  "hotel_unit", "hotel_apartment", "resort_villa", "branded_residence",
];

const COUNTRY_RULES: Record<string, CountryPropertyRules> = {
  AE: {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    currency: "AED",
    languages: ["ar", "en"],
    timezone: "Asia/Dubai",
    addressFormat: ["building", "street", "area", "city", "emirate"],
    phonePrefix: "+971",
    areaUnit: "sqft",
    allowedPropertyTypes: ALL_STANDARD_TYPES,
    requiredDocuments: ["title_deed", "identity"],
    contractRules: {
      minLeaseDuration: 12,
      depositMultiplier: 1,
      noticePeriodDays: 90,
      renewalPolicy: "auto",
    },
    taxRules: { vatRate: 5, registrationFee: 4 },
    localLabels: { district: "Area", zone: "Community" },
    adminStructure: ["emirate", "city", "area", "community"],
  },
  FR: {
    countryCode: "FR",
    countryName: "France",
    currency: "EUR",
    languages: ["fr"],
    timezone: "Europe/Paris",
    addressFormat: ["number", "street", "postalCode", "city", "region"],
    phonePrefix: "+33",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES, ...DEFAULT_LAND_TYPES],
    requiredDocuments: ["identity", "proof_of_income", "insurance"],
    contractRules: {
      minLeaseDuration: 12,
      maxLeaseDuration: 36,
      depositMultiplier: 1,
      noticePeriodDays: 90,
      renewalPolicy: "auto",
    },
    taxRules: { vatRate: 20, stampDuty: 5.8, rentalIncomeTax: 30 },
    localLabels: { district: "Arrondissement", zone: "Quartier" },
    adminStructure: ["region", "departement", "city", "arrondissement"],
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    currency: "USD",
    languages: ["en"],
    timezone: "America/New_York",
    addressFormat: ["number", "street", "apt", "city", "state", "zip"],
    phonePrefix: "+1",
    areaUnit: "sqft",
    allowedPropertyTypes: ALL_STANDARD_TYPES,
    requiredDocuments: ["identity"],
    contractRules: {
      minLeaseDuration: 6,
      maxLeaseDuration: 24,
      depositMultiplier: 2,
      noticePeriodDays: 30,
      renewalPolicy: "manual",
    },
    taxRules: { capitalGainsTax: 15 },
    adminStructure: ["state", "county", "city", "neighborhood"],
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    languages: ["en"],
    timezone: "Europe/London",
    addressFormat: ["number", "street", "city", "county", "postcode"],
    phonePrefix: "+44",
    areaUnit: "sqft",
    allowedPropertyTypes: ALL_STANDARD_TYPES,
    requiredDocuments: ["identity", "proof_of_income"],
    contractRules: {
      minLeaseDuration: 6,
      depositMultiplier: 5,
      noticePeriodDays: 60,
      renewalPolicy: "negotiated",
    },
    taxRules: { stampDuty: 3, vatRate: 20, capitalGainsTax: 18, rentalIncomeTax: 20 },
    adminStructure: ["country", "county", "city", "borough"],
  },
  SA: {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    currency: "SAR",
    languages: ["ar", "en"],
    timezone: "Asia/Riyadh",
    addressFormat: ["building", "street", "district", "city", "region"],
    phonePrefix: "+966",
    areaUnit: "sqm",
    allowedPropertyTypes: ALL_STANDARD_TYPES,
    requiredDocuments: ["title_deed", "identity"],
    contractRules: {
      minLeaseDuration: 12,
      depositMultiplier: 1,
      noticePeriodDays: 60,
      renewalPolicy: "negotiated",
    },
    taxRules: { vatRate: 15, registrationFee: 5 },
    adminStructure: ["region", "city", "district"],
  },
  MA: {
    countryCode: "MA",
    countryName: "Morocco",
    currency: "MAD",
    languages: ["ar", "fr"],
    timezone: "Africa/Casablanca",
    addressFormat: ["number", "street", "quartier", "city", "region"],
    phonePrefix: "+212",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES, ...DEFAULT_LAND_TYPES],
    requiredDocuments: ["identity", "title_deed"],
    contractRules: {
      minLeaseDuration: 12,
      depositMultiplier: 2,
      noticePeriodDays: 90,
      renewalPolicy: "manual",
    },
    taxRules: { vatRate: 20, registrationFee: 4, rentalIncomeTax: 15 },
    localLabels: { district: "Quartier", zone: "Secteur" },
    adminStructure: ["region", "prefecture", "city", "quartier"],
  },
  EG: {
    countryCode: "EG",
    countryName: "Egypt",
    currency: "EGP",
    languages: ["ar", "en"],
    timezone: "Africa/Cairo",
    addressFormat: ["building", "street", "district", "city", "governorate"],
    phonePrefix: "+20",
    areaUnit: "sqm",
    allowedPropertyTypes: ALL_STANDARD_TYPES,
    requiredDocuments: ["identity", "title_deed"],
    contractRules: {
      minLeaseDuration: 12,
      depositMultiplier: 2,
      noticePeriodDays: 60,
      renewalPolicy: "manual",
    },
    taxRules: { vatRate: 14, stampDuty: 3 },
    adminStructure: ["governorate", "city", "district"],
  },
  IN: {
    countryCode: "IN",
    countryName: "India",
    currency: "INR",
    languages: ["en", "hi"],
    timezone: "Asia/Kolkata",
    addressFormat: ["flat", "building", "street", "locality", "city", "state", "pin"],
    phonePrefix: "+91",
    areaUnit: "sqft",
    allowedPropertyTypes: ALL_STANDARD_TYPES,
    requiredDocuments: ["identity", "proof_of_income"],
    contractRules: {
      minLeaseDuration: 11,
      depositMultiplier: 2,
      noticePeriodDays: 30,
      renewalPolicy: "manual",
    },
    taxRules: { stampDuty: 6, registrationFee: 1, rentalIncomeTax: 30 },
    adminStructure: ["state", "city", "locality"],
  },
};

const DEFAULT_RULES: CountryPropertyRules = {
  countryCode: "XX",
  countryName: "International",
  currency: "USD",
  languages: ["en"],
  timezone: "UTC",
  addressFormat: ["street", "city", "state", "postalCode", "country"],
  phonePrefix: "+1",
  areaUnit: "sqm",
  allowedPropertyTypes: ALL_STANDARD_TYPES,
  requiredDocuments: ["identity"],
  contractRules: {
    minLeaseDuration: 12,
    depositMultiplier: 1,
    noticePeriodDays: 30,
    renewalPolicy: "manual",
  },
  taxRules: {},
  adminStructure: ["state", "city", "district"],
};

export function getCountryRules(countryCode: string): CountryPropertyRules {
  return COUNTRY_RULES[countryCode.toUpperCase()] ?? { ...DEFAULT_RULES, countryCode: countryCode.toUpperCase() };
}

export function isPropertyTypeAllowed(countryCode: string, type: PropertyType): boolean {
  const rules = getCountryRules(countryCode);
  return rules.allowedPropertyTypes.includes(type);
}

export function getRequiredDocuments(countryCode: string): DocumentType[] {
  return getCountryRules(countryCode).requiredDocuments;
}

export function getDefaultAreaUnit(countryCode: string): AreaUnit {
  return getCountryRules(countryCode).areaUnit;
}

export function getSupportedCountries(): string[] {
  return Object.keys(COUNTRY_RULES);
}

export function getContractDefaults(countryCode: string) {
  return getCountryRules(countryCode).contractRules;
}

export function getTaxRules(countryCode: string) {
  return getCountryRules(countryCode).taxRules;
}
