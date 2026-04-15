import type { CurrencyCode } from "@/domains/shared/canonical-types";
import type { PropertyType, AreaUnit, DocumentType } from "./canonical-types";

export type LeaseCategory = "empty" | "furnished" | "commercial" | "seasonal" | "professional" | "rural";
export type PaymentFrequency = "monthly" | "quarterly" | "semi_annual" | "annual" | "weekly";
export type LegalDocumentFormat = "pdf" | "html" | "docx";

export interface RentalLaw {
  name: string;
  reference: string;
  summary: string;
  tenantProtection: "high" | "medium" | "low";
  evictionDifficulty: "very_hard" | "hard" | "moderate" | "easy";
  rentControlled: boolean;
  rentIncreaseRule?: string;
  securityDepositCap?: string;
}

export interface LegalObligation {
  id: string;
  party: "landlord" | "tenant" | "both";
  description: string;
  mandatory: boolean;
  penalty?: string;
  documentRequired?: DocumentType;
}

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
  rentalLaw?: RentalLaw;
  leaseTypes: LeaseCategory[];
  paymentFrequencies: PaymentFrequency[];
  legalObligations: LegalObligation[];
  documentFormats: LegalDocumentFormat[];
  eSignatureSupported: boolean;
  rentReceiptMandatory: boolean;
  inventoryRequired: boolean;
  insuranceMandatory: boolean;
  diagnosticsMandatory: boolean;
  guarantorAllowed: boolean;
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

const FR_OBLIGATIONS: LegalObligation[] = [
  { id: "fr_dpe", party: "landlord", description: "Diagnostic de Performance Énergétique (DPE)", mandatory: true, documentRequired: "energy_certificate" },
  { id: "fr_insurance", party: "tenant", description: "Assurance habitation obligatoire", mandatory: true, documentRequired: "insurance" },
  { id: "fr_amiante", party: "landlord", description: "Diagnostic amiante (immeubles avant 1997)", mandatory: true },
  { id: "fr_plomb", party: "landlord", description: "Constat de risque d'exposition au plomb (CREP)", mandatory: true },
  { id: "fr_elec_gaz", party: "landlord", description: "Diagnostic électricité et gaz (installations > 15 ans)", mandatory: true },
  { id: "fr_surface", party: "landlord", description: "Attestation de surface habitable (loi Boutin)", mandatory: true },
  { id: "fr_etat_lieux", party: "both", description: "État des lieux d'entrée et de sortie", mandatory: true },
  { id: "fr_quittance", party: "landlord", description: "Délivrance de quittance de loyer sur demande", mandatory: true },
];

const AE_OBLIGATIONS: LegalObligation[] = [
  { id: "ae_ejari", party: "both", description: "Ejari registration required within 14 days", mandatory: true },
  { id: "ae_dewa", party: "tenant", description: "DEWA account transfer", mandatory: true },
  { id: "ae_title_deed", party: "landlord", description: "Title deed or power of attorney", mandatory: true, documentRequired: "title_deed" },
];

const US_OBLIGATIONS: LegalObligation[] = [
  { id: "us_lead_paint", party: "landlord", description: "Lead paint disclosure (pre-1978 buildings)", mandatory: true },
  { id: "us_habitability", party: "landlord", description: "Implied warranty of habitability", mandatory: true },
  { id: "us_security_deposit", party: "landlord", description: "Security deposit return within 30 days of move-out", mandatory: true },
];

const GB_OBLIGATIONS: LegalObligation[] = [
  { id: "gb_deposit_scheme", party: "landlord", description: "Deposit protection in government scheme within 30 days", mandatory: true },
  { id: "gb_epc", party: "landlord", description: "Energy Performance Certificate (minimum E rating)", mandatory: true, documentRequired: "energy_certificate" },
  { id: "gb_gas_safety", party: "landlord", description: "Annual gas safety certificate", mandatory: true },
  { id: "gb_how_to_rent", party: "landlord", description: "Provide 'How to Rent' guide at start of tenancy", mandatory: true },
  { id: "gb_right_to_rent", party: "landlord", description: "Right to Rent check on all adult occupiers", mandatory: true },
];

const MA_OBLIGATIONS: LegalObligation[] = [
  { id: "ma_registration", party: "both", description: "Enregistrement du bail auprès de l'administration fiscale", mandatory: true },
  { id: "ma_etat_lieux", party: "both", description: "État des lieux contradictoire", mandatory: true },
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
    rentalLaw: {
      name: "RERA Tenancy Law",
      reference: "Law No. 26/2007 (Dubai) + amendments",
      summary: "Regulates rental relationships in Dubai; RERA sets rent increase limits via calculator",
      tenantProtection: "medium",
      evictionDifficulty: "moderate",
      rentControlled: true,
      rentIncreaseRule: "RERA Rental Index — max increase based on market comparisons",
      securityDepositCap: "5% of annual rent (residential), 10% (commercial)",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["annual", "semi_annual", "quarterly", "monthly"],
    legalObligations: AE_OBLIGATIONS,
    documentFormats: ["pdf"],
    eSignatureSupported: true,
    rentReceiptMandatory: false,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: false,
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
    rentalLaw: {
      name: "Loi ALUR + Loi du 6 juillet 1989",
      reference: "Loi n° 89-462 du 6 juillet 1989 modifiée par loi ALUR 2014",
      summary: "Encadrement strict des loyers en zones tendues, bail type 3 ans vide / 1 an meublé, forte protection locataire",
      tenantProtection: "high",
      evictionDifficulty: "very_hard",
      rentControlled: true,
      rentIncreaseRule: "IRL (Indice de Référence des Loyers) — plafonnement annuel",
      securityDepositCap: "1 mois HC (vide), 2 mois HC (meublé)",
    },
    leaseTypes: ["empty", "furnished", "commercial", "professional", "seasonal"],
    paymentFrequencies: ["monthly", "quarterly"],
    legalObligations: FR_OBLIGATIONS,
    documentFormats: ["pdf", "html"],
    eSignatureSupported: true,
    rentReceiptMandatory: true,
    inventoryRequired: true,
    insuranceMandatory: true,
    diagnosticsMandatory: true,
    guarantorAllowed: true,
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
    rentalLaw: {
      name: "State-level Landlord-Tenant Acts",
      reference: "Varies by state (e.g., CA Civil Code §1940-1954)",
      summary: "Rules vary by state; some cities have rent control (NYC, SF, LA)",
      tenantProtection: "medium",
      evictionDifficulty: "moderate",
      rentControlled: false,
      rentIncreaseRule: "Market-rate unless local rent control applies",
      securityDepositCap: "1-3 months depending on state",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: US_OBLIGATIONS,
    documentFormats: ["pdf", "docx"],
    eSignatureSupported: true,
    rentReceiptMandatory: false,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
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
    rentalLaw: {
      name: "Housing Act 1988 + Renters Reform Bill",
      reference: "Housing Act 1988 c.50, Tenant Fees Act 2019",
      summary: "AST standard tenancy, Section 21 being abolished, deposit protection mandatory",
      tenantProtection: "medium",
      evictionDifficulty: "hard",
      rentControlled: false,
      rentIncreaseRule: "Market rate with fair rent tribunal option",
      securityDepositCap: "5 weeks rent (annual rent < £50k)",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: GB_OBLIGATIONS,
    documentFormats: ["pdf"],
    eSignatureSupported: true,
    rentReceiptMandatory: false,
    inventoryRequired: true,
    insuranceMandatory: false,
    diagnosticsMandatory: true,
    guarantorAllowed: true,
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
    rentalLaw: {
      name: "Ejar Platform Regulations",
      reference: "Real Estate General Authority (REGA) regulations",
      summary: "Mandatory Ejar registration, standardized contracts via government platform",
      tenantProtection: "medium",
      evictionDifficulty: "moderate",
      rentControlled: false,
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["annual", "semi_annual", "quarterly", "monthly"],
    legalObligations: [
      { id: "sa_ejar", party: "both", description: "Ejar platform registration mandatory", mandatory: true },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: true,
    rentReceiptMandatory: false,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: false,
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
    rentalLaw: {
      name: "Dahir n° 1-13-111 (Loi 67-12)",
      reference: "Loi 67-12 relative aux baux d'habitation",
      summary: "Bail résidentiel régi par loi 67-12, bail commercial par dahir 1955",
      tenantProtection: "medium",
      evictionDifficulty: "hard",
      rentControlled: false,
      rentIncreaseRule: "Accord amiable ou décision judiciaire",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly", "quarterly"],
    legalObligations: MA_OBLIGATIONS,
    documentFormats: ["pdf"],
    eSignatureSupported: false,
    rentReceiptMandatory: true,
    inventoryRequired: true,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
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
    rentalLaw: {
      name: "Civil Code + Tenant Protection Law 136/1981",
      reference: "Law 136/1981, Law 4/1996",
      summary: "Old-rent laws (pre-1996) heavily protect tenants; new contracts are market-rate",
      tenantProtection: "high",
      evictionDifficulty: "very_hard",
      rentControlled: true,
      rentIncreaseRule: "Old rent: fixed by law (7% annual for commercial). New rent: market rate.",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly", "quarterly", "annual"],
    legalObligations: [
      { id: "eg_registration", party: "both", description: "Contract registration at Shahr Al-Aqari (Real Estate Registry)", mandatory: true },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: false,
    rentReceiptMandatory: true,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
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
    rentalLaw: {
      name: "Model Tenancy Act 2021 + State Rent Control Acts",
      reference: "Model Tenancy Act 2021 (central), various state Rent Control Acts",
      summary: "11-month agreements avoid registration; MTA 2021 modernizes but adoption varies",
      tenantProtection: "medium",
      evictionDifficulty: "hard",
      rentControlled: false,
      rentIncreaseRule: "Typically 5-10% annual by agreement",
      securityDepositCap: "2 months residential, 6 months commercial (MTA)",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: [
      { id: "in_police_verification", party: "landlord", description: "Police verification of tenant mandatory", mandatory: true },
      { id: "in_registration", party: "both", description: "Lease registration mandatory for agreements > 11 months", mandatory: true },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: true,
    rentReceiptMandatory: true,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
  },
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    currency: "EUR",
    languages: ["de"],
    timezone: "Europe/Berlin",
    addressFormat: ["street", "number", "postalCode", "city", "state"],
    phonePrefix: "+49",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES, ...DEFAULT_LAND_TYPES],
    requiredDocuments: ["identity", "proof_of_income"],
    contractRules: {
      minLeaseDuration: 12,
      depositMultiplier: 3,
      noticePeriodDays: 90,
      renewalPolicy: "auto",
    },
    taxRules: { vatRate: 19, stampDuty: 3.5, rentalIncomeTax: 25, capitalGainsTax: 25 },
    adminStructure: ["bundesland", "stadt", "bezirk"],
    rentalLaw: {
      name: "Bürgerliches Gesetzbuch (BGB) §535-580",
      reference: "BGB §535-580a, Mietpreisbremse",
      summary: "Strong tenant protection, Mietpreisbremse (rent brake) in 300+ cities, indefinite leases standard",
      tenantProtection: "high",
      evictionDifficulty: "very_hard",
      rentControlled: true,
      rentIncreaseRule: "Mietpreisbremse: max 10% above Mietspiegel; cap 20% in 3 years",
      securityDepositCap: "3 Kaltmieten (cold rent months)",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: [
      { id: "de_energieausweis", party: "landlord", description: "Energieausweis (energy certificate) mandatory", mandatory: true, documentRequired: "energy_certificate" },
      { id: "de_kaution_account", party: "landlord", description: "Kaution must be held in separate account", mandatory: true },
      { id: "de_nebenkostenabrechnung", party: "landlord", description: "Annual utility cost statement (Nebenkostenabrechnung)", mandatory: true },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: true,
    rentReceiptMandatory: false,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: true,
    guarantorAllowed: true,
  },
  TN: {
    countryCode: "TN",
    countryName: "Tunisia",
    currency: "TND",
    languages: ["ar", "fr"],
    timezone: "Africa/Tunis",
    addressFormat: ["number", "street", "city", "governorate"],
    phonePrefix: "+216",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES],
    requiredDocuments: ["identity"],
    contractRules: { minLeaseDuration: 12, depositMultiplier: 2, noticePeriodDays: 90, renewalPolicy: "manual" },
    taxRules: { vatRate: 19, rentalIncomeTax: 15 },
    adminStructure: ["governorate", "delegation", "city"],
    rentalLaw: {
      name: "Code des Obligations et des Contrats (COC)",
      reference: "COC articles 727-757",
      summary: "Bail résidentiel et commercial encadrés par COC; protection locataire modérée",
      tenantProtection: "medium",
      evictionDifficulty: "moderate",
      rentControlled: false,
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly", "quarterly"],
    legalObligations: MA_OBLIGATIONS,
    documentFormats: ["pdf"],
    eSignatureSupported: false,
    rentReceiptMandatory: true,
    inventoryRequired: true,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
  },
  SN: {
    countryCode: "SN",
    countryName: "Senegal",
    currency: "XOF",
    languages: ["fr"],
    timezone: "Africa/Dakar",
    addressFormat: ["number", "street", "quartier", "city", "region"],
    phonePrefix: "+221",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES],
    requiredDocuments: ["identity"],
    contractRules: { minLeaseDuration: 12, depositMultiplier: 2, noticePeriodDays: 90, renewalPolicy: "manual" },
    taxRules: { vatRate: 18, rentalIncomeTax: 20 },
    adminStructure: ["region", "departement", "commune"],
    rentalLaw: {
      name: "Loi n° 2014-03 relative au bail à usage d'habitation",
      reference: "Loi 2014-03",
      summary: "Encadrement strict du bail résidentiel, plafonnement loyer initial, protection locataire renforcée",
      tenantProtection: "high",
      evictionDifficulty: "hard",
      rentControlled: true,
      rentIncreaseRule: "Plafonné par décret, révisable tous les 3 ans",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: [
      { id: "sn_registration", party: "both", description: "Enregistrement du bail obligatoire", mandatory: true },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: false,
    rentReceiptMandatory: true,
    inventoryRequired: true,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
  },
  CI: {
    countryCode: "CI",
    countryName: "Côte d'Ivoire",
    currency: "XOF",
    languages: ["fr"],
    timezone: "Africa/Abidjan",
    addressFormat: ["quartier", "street", "city", "commune"],
    phonePrefix: "+225",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES],
    requiredDocuments: ["identity"],
    contractRules: { minLeaseDuration: 12, depositMultiplier: 3, noticePeriodDays: 90, renewalPolicy: "manual" },
    taxRules: { vatRate: 18, rentalIncomeTax: 15 },
    adminStructure: ["district", "region", "commune"],
    rentalLaw: {
      name: "Loi n° 2019-576 relative au bail à habitation",
      reference: "Loi 2019-576",
      summary: "Bail encadré, caution plafonnée à 3 mois, quittance obligatoire",
      tenantProtection: "medium",
      evictionDifficulty: "moderate",
      rentControlled: false,
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: [
      { id: "ci_quittance", party: "landlord", description: "Quittance de loyer obligatoire", mandatory: true },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: false,
    rentReceiptMandatory: true,
    inventoryRequired: true,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
  },
  CM: {
    countryCode: "CM",
    countryName: "Cameroon",
    currency: "XAF",
    languages: ["fr", "en"],
    timezone: "Africa/Douala",
    addressFormat: ["quartier", "street", "city", "region"],
    phonePrefix: "+237",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES],
    requiredDocuments: ["identity"],
    contractRules: { minLeaseDuration: 12, depositMultiplier: 3, noticePeriodDays: 90, renewalPolicy: "manual" },
    taxRules: { vatRate: 19.25, rentalIncomeTax: 15 },
    adminStructure: ["region", "departement", "arrondissement"],
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: [],
    documentFormats: ["pdf"],
    eSignatureSupported: false,
    rentReceiptMandatory: true,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
  },
  TR: {
    countryCode: "TR",
    countryName: "Turkey",
    currency: "TRY",
    languages: ["tr"],
    timezone: "Europe/Istanbul",
    addressFormat: ["street", "number", "mahalle", "ilce", "city"],
    phonePrefix: "+90",
    areaUnit: "sqm",
    allowedPropertyTypes: ALL_STANDARD_TYPES,
    requiredDocuments: ["identity"],
    contractRules: { minLeaseDuration: 12, depositMultiplier: 3, noticePeriodDays: 30, renewalPolicy: "auto" },
    taxRules: { vatRate: 20, stampDuty: 0.189, rentalIncomeTax: 15 },
    adminStructure: ["il", "ilce", "mahalle"],
    rentalLaw: {
      name: "Turkish Code of Obligations (TBK)",
      reference: "TBK articles 299-378",
      summary: "5-year minimum protection period; rent increases capped at CPI or 25% (whichever lower)",
      tenantProtection: "high",
      evictionDifficulty: "hard",
      rentControlled: true,
      rentIncreaseRule: "CPI or 25% cap (whichever is lower) for first 5 years",
    },
    leaseTypes: ["empty", "furnished", "commercial"],
    paymentFrequencies: ["monthly"],
    legalObligations: [
      { id: "tr_tapu", party: "landlord", description: "Tapu (title deed) verification", mandatory: true, documentRequired: "title_deed" },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: true,
    rentReceiptMandatory: false,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: false,
    guarantorAllowed: true,
  },
  ES: {
    countryCode: "ES",
    countryName: "Spain",
    currency: "EUR",
    languages: ["es"],
    timezone: "Europe/Madrid",
    addressFormat: ["street", "number", "piso", "city", "province", "postalCode"],
    phonePrefix: "+34",
    areaUnit: "sqm",
    allowedPropertyTypes: [...DEFAULT_RESIDENTIAL_TYPES, ...DEFAULT_COMMERCIAL_TYPES, ...DEFAULT_LAND_TYPES],
    requiredDocuments: ["identity", "proof_of_income"],
    contractRules: { minLeaseDuration: 60, depositMultiplier: 1, noticePeriodDays: 30, renewalPolicy: "auto" },
    taxRules: { vatRate: 21, rentalIncomeTax: 19, capitalGainsTax: 19 },
    adminStructure: ["comunidad", "provincia", "municipio", "barrio"],
    rentalLaw: {
      name: "Ley de Arrendamientos Urbanos (LAU)",
      reference: "LAU 29/1994, modified by RDL 7/2019",
      summary: "5-year minimum (individual) or 7 years (corporate); rent control in zonas tensionadas",
      tenantProtection: "high",
      evictionDifficulty: "hard",
      rentControlled: true,
      rentIncreaseRule: "IPC cap (max 3% in 2024), rent control in stressed areas",
      securityDepositCap: "1 month (residential), negotiable (commercial)",
    },
    leaseTypes: ["empty", "furnished", "commercial", "seasonal"],
    paymentFrequencies: ["monthly"],
    legalObligations: [
      { id: "es_certificado_energetico", party: "landlord", description: "Certificado de Eficiencia Energética", mandatory: true, documentRequired: "energy_certificate" },
      { id: "es_fianza", party: "landlord", description: "Deposit (fianza) to regional authority within 30 days", mandatory: true },
    ],
    documentFormats: ["pdf"],
    eSignatureSupported: true,
    rentReceiptMandatory: true,
    inventoryRequired: false,
    insuranceMandatory: false,
    diagnosticsMandatory: true,
    guarantorAllowed: true,
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
  leaseTypes: ["empty", "furnished", "commercial"],
  paymentFrequencies: ["monthly"],
  legalObligations: [],
  documentFormats: ["pdf"],
  eSignatureSupported: false,
  rentReceiptMandatory: false,
  inventoryRequired: false,
  insuranceMandatory: false,
  diagnosticsMandatory: false,
  guarantorAllowed: true,
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

export function getRentalLaw(countryCode: string): RentalLaw | undefined {
  return getCountryRules(countryCode).rentalLaw;
}

export function getLeaseTypes(countryCode: string): LeaseCategory[] {
  return getCountryRules(countryCode).leaseTypes;
}

export function getPaymentFrequencies(countryCode: string): PaymentFrequency[] {
  return getCountryRules(countryCode).paymentFrequencies;
}

export function getLegalObligations(countryCode: string, party?: "landlord" | "tenant" | "both"): LegalObligation[] {
  const obligations = getCountryRules(countryCode).legalObligations;
  if (!party) return obligations;
  return obligations.filter(o => o.party === party || o.party === "both");
}

export function isRentReceiptMandatory(countryCode: string): boolean {
  return getCountryRules(countryCode).rentReceiptMandatory;
}

export function isESignatureSupported(countryCode: string): boolean {
  return getCountryRules(countryCode).eSignatureSupported;
}

export function computeDeposit(countryCode: string, monthlyRent: number): number {
  const rules = getCountryRules(countryCode);
  return monthlyRent * (rules.contractRules.depositMultiplier ?? 1);
}

export function computeTaxOnRent(countryCode: string, annualRent: number): { incomeTax: number; vat: number; total: number } {
  const tax = getTaxRules(countryCode);
  const incomeTax = annualRent * ((tax.rentalIncomeTax ?? 0) / 100);
  const vat = annualRent * ((tax.vatRate ?? 0) / 100);
  return { incomeTax, vat, total: incomeTax + vat };
}

const AREA_AVG_PRICE_PER_SQM: Record<string, number> = {
  AE: 13000, FR: 5500, US: 4000, GB: 6000, SA: 4500, MA: 1200,
  EG: 800, IN: 2500, DE: 5000, TR: 1500, ES: 3000, KE: 1800,
  TN: 1000, SN: 900, CI: 850, CM: 700,
};

const DEFAULT_AREA_AVG_PRICE_PER_SQM = 8000;

export interface CountryInvestmentData {
  countryCode: string;
  countryName: string;
  currency: CurrencyCode;
  areaUnit: AreaUnit;
  areaAvgPricePerSqm: number;
  taxRules: CountryPropertyRules["taxRules"];
  transactionCosts: {
    stampDuty: number;
    registrationFee: number;
    totalPct: number;
  };
  legalConstraints: {
    tenantProtection: string;
    evictionDifficulty: string;
    rentControlled: boolean;
    rentIncreaseRule?: string;
  };
  rentalLawName?: string;
}

export function getCountryInvestmentData(countryCode: string): CountryInvestmentData {
  const rules = getCountryRules(countryCode);
  const stampDuty = rules.taxRules.stampDuty ?? 0;
  const registrationFee = rules.taxRules.registrationFee ?? 0;
  const code = countryCode.toUpperCase();

  return {
    countryCode: rules.countryCode,
    countryName: rules.countryName,
    currency: rules.currency,
    areaUnit: rules.areaUnit,
    areaAvgPricePerSqm: AREA_AVG_PRICE_PER_SQM[code] ?? DEFAULT_AREA_AVG_PRICE_PER_SQM,
    taxRules: rules.taxRules,
    transactionCosts: {
      stampDuty,
      registrationFee,
      totalPct: stampDuty + registrationFee,
    },
    legalConstraints: {
      tenantProtection: rules.rentalLaw?.tenantProtection ?? "unknown",
      evictionDifficulty: rules.rentalLaw?.evictionDifficulty ?? "unknown",
      rentControlled: rules.rentalLaw?.rentControlled ?? false,
      rentIncreaseRule: rules.rentalLaw?.rentIncreaseRule,
    },
    rentalLawName: rules.rentalLaw?.name,
  };
}
