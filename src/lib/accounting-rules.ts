/**
 * Country-specific accounting & fiscal rules for property management.
 * Each country defines: tax rates, VAT, fiscal year, deductible categories, etc.
 */

export interface CountryAccountingRules {
  country: string;
  fiscalYearStart: string; // "01-01" or "04-01" etc.
  currency: string;
  currencySymbol: string;
  vatApplicable: boolean;
  vatRates: { standard: number; reduced?: number; rental?: number };
  rentalIncomeTax: { type: "flat" | "progressive" | "exempt"; rate?: number; bracket?: string };
  depositCap?: string; // e.g. "2 months rent"
  stampDuty?: boolean;
  capitalGainsTax?: { rate: number; exemptionYears?: number };
  deductibleCategories: string[];
  propertyTax: boolean;
  socialCharges?: number; // % on rental income
  withholding?: boolean;
  invoiceRequired: boolean;
  reportingFrequency: "monthly" | "quarterly" | "annual";
  categoryLabels: Record<string, string>;
}

const rules: Record<string, CountryAccountingRules> = {
  FR: {
    country: "FR", fiscalYearStart: "01-01", currency: "EUR", currencySymbol: "€",
    vatApplicable: false, vatRates: { standard: 20, reduced: 10, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "1 mois (vide), 2 mois (meublé)",
    capitalGainsTax: { rate: 19, exemptionYears: 22 }, stampDuty: false,
    deductibleCategories: ["insurance", "maintenance", "management", "tax", "interest", "depreciation"],
    propertyTax: true, socialCharges: 17.2, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Loyer", charges: "Charges", deposit: "Dépôt", maintenance: "Travaux", insurance: "Assurance", tax: "Impôts & Taxes", utilities: "Services", management: "Gestion", booking: "Saisonnier", other: "Autre", interest: "Intérêts d'emprunt", depreciation: "Amortissement" },
  },
  DE: {
    country: "DE", fiscalYearStart: "01-01", currency: "EUR", currencySymbol: "€",
    vatApplicable: false, vatRates: { standard: 19, reduced: 7, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "3 Monatsmieten",
    capitalGainsTax: { rate: 25, exemptionYears: 10 }, stampDuty: true,
    deductibleCategories: ["insurance", "maintenance", "management", "tax", "interest", "depreciation", "utilities"],
    propertyTax: true, invoiceRequired: true, reportingFrequency: "annual",
    categoryLabels: { rent: "Miete", charges: "Nebenkosten", deposit: "Kaution", maintenance: "Instandhaltung", insurance: "Versicherung", tax: "Steuern", utilities: "Betriebskosten", management: "Verwaltung", booking: "Ferienvermietung", other: "Sonstiges" },
  },
  ES: {
    country: "ES", fiscalYearStart: "01-01", currency: "EUR", currencySymbol: "€",
    vatApplicable: false, vatRates: { standard: 21, reduced: 10, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "1 mes (vivienda), 2 meses (uso distinto)",
    capitalGainsTax: { rate: 19 }, stampDuty: true,
    deductibleCategories: ["insurance", "maintenance", "management", "tax", "interest", "depreciation", "utilities"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "quarterly",
    categoryLabels: { rent: "Alquiler", charges: "Gastos", deposit: "Fianza", maintenance: "Reparaciones", insurance: "Seguro", tax: "Impuestos", utilities: "Suministros", management: "Gestión", booking: "Alquiler vacacional", other: "Otros" },
  },
  IT: {
    country: "IT", fiscalYearStart: "01-01", currency: "EUR", currencySymbol: "€",
    vatApplicable: false, vatRates: { standard: 22, reduced: 10, rental: 0 },
    rentalIncomeTax: { type: "flat", rate: 21, bracket: "Cedolare secca" }, depositCap: "3 mensilità",
    capitalGainsTax: { rate: 26, exemptionYears: 5 }, stampDuty: true,
    deductibleCategories: ["insurance", "maintenance", "tax", "management"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Canone", charges: "Spese", deposit: "Cauzione", maintenance: "Manutenzione", insurance: "Assicurazione", tax: "Tasse", utilities: "Utenze", management: "Gestione", booking: "Affitto breve", other: "Altro" },
  },
  PT: {
    country: "PT", fiscalYearStart: "01-01", currency: "EUR", currencySymbol: "€",
    vatApplicable: false, vatRates: { standard: 23, reduced: 6, rental: 0 },
    rentalIncomeTax: { type: "flat", rate: 28 }, depositCap: "2 meses",
    capitalGainsTax: { rate: 28 }, stampDuty: true,
    deductibleCategories: ["insurance", "maintenance", "management", "tax"],
    propertyTax: true, invoiceRequired: true, reportingFrequency: "annual",
    categoryLabels: { rent: "Renda", charges: "Encargos", deposit: "Caução", maintenance: "Manutenção", insurance: "Seguro", tax: "Impostos", utilities: "Serviços", management: "Gestão", booking: "Alojamento local", other: "Outro" },
  },
  GB: {
    country: "GB", fiscalYearStart: "04-06", currency: "GBP", currencySymbol: "£",
    vatApplicable: false, vatRates: { standard: 20, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "5 weeks' rent",
    capitalGainsTax: { rate: 18 }, stampDuty: true,
    deductibleCategories: ["insurance", "maintenance", "management", "utilities", "letting_agent"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Rent", charges: "Service charges", deposit: "Deposit", maintenance: "Repairs", insurance: "Insurance", tax: "Council tax", utilities: "Utilities", management: "Management fees", booking: "Holiday let", other: "Other" },
  },
  US: {
    country: "US", fiscalYearStart: "01-01", currency: "USD", currencySymbol: "$",
    vatApplicable: false, vatRates: { standard: 0, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "Varies by state",
    capitalGainsTax: { rate: 15 }, stampDuty: false,
    deductibleCategories: ["insurance", "maintenance", "management", "tax", "interest", "depreciation", "utilities", "travel", "legal"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Rent", charges: "Fees", deposit: "Security deposit", maintenance: "Repairs & Maintenance", insurance: "Insurance", tax: "Property taxes", utilities: "Utilities", management: "Management", booking: "Short-term rental", other: "Other", interest: "Mortgage interest", depreciation: "Depreciation" },
  },
  AE: {
    country: "AE", fiscalYearStart: "01-01", currency: "AED", currencySymbol: "AED",
    vatApplicable: false, vatRates: { standard: 5, rental: 0 },
    rentalIncomeTax: { type: "exempt" },
    capitalGainsTax: { rate: 0 }, stampDuty: false,
    deductibleCategories: ["maintenance", "management"],
    propertyTax: false, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Rent", charges: "Fees", deposit: "Security deposit", maintenance: "Maintenance", insurance: "Insurance", management: "Management", booking: "Holiday rental", other: "Other" },
  },
  JP: {
    country: "JP", fiscalYearStart: "01-01", currency: "JPY", currencySymbol: "¥",
    vatApplicable: false, vatRates: { standard: 10, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "1~2ヶ月分",
    capitalGainsTax: { rate: 20, exemptionYears: 5 }, stampDuty: true,
    deductibleCategories: ["insurance", "maintenance", "management", "tax", "depreciation"],
    propertyTax: true, invoiceRequired: true, reportingFrequency: "annual",
    categoryLabels: { rent: "賃料", charges: "管理費", deposit: "敷金", maintenance: "修繕費", insurance: "保険", tax: "固定資産税", utilities: "光熱費", management: "管理費", booking: "民泊", other: "その他" },
  },
  BR: {
    country: "BR", fiscalYearStart: "01-01", currency: "BRL", currencySymbol: "R$",
    vatApplicable: false, vatRates: { standard: 0, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "3 meses",
    capitalGainsTax: { rate: 15 }, stampDuty: false,
    deductibleCategories: ["insurance", "maintenance", "tax", "management"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "monthly",
    categoryLabels: { rent: "Aluguel", charges: "Encargos", deposit: "Caução", maintenance: "Manutenção", insurance: "Seguro", tax: "IPTU", utilities: "Serviços", management: "Administração", booking: "Temporada", other: "Outro" },
  },
  MA: {
    country: "MA", fiscalYearStart: "01-01", currency: "MAD", currencySymbol: "DH",
    vatApplicable: false, vatRates: { standard: 20, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "2 mois",
    deductibleCategories: ["maintenance", "insurance", "tax"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Loyer", charges: "Charges", deposit: "Caution", maintenance: "Entretien", insurance: "Assurance", tax: "Taxe d'habitation", management: "Gestion", other: "Autre" },
  },
  AU: {
    country: "AU", fiscalYearStart: "07-01", currency: "AUD", currencySymbol: "A$",
    vatApplicable: false, vatRates: { standard: 10, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "4 weeks' rent",
    capitalGainsTax: { rate: 0, exemptionYears: 0 }, stampDuty: true,
    deductibleCategories: ["insurance", "maintenance", "management", "tax", "interest", "depreciation", "travel"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Rent", charges: "Outgoings", deposit: "Bond", maintenance: "Repairs", insurance: "Insurance", tax: "Council rates", utilities: "Utilities", management: "Agent fees", booking: "Holiday let", other: "Other" },
  },
  IN: {
    country: "IN", fiscalYearStart: "04-01", currency: "INR", currencySymbol: "₹",
    vatApplicable: false, vatRates: { standard: 18, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "2-10 months",
    capitalGainsTax: { rate: 20, exemptionYears: 2 },
    deductibleCategories: ["maintenance", "insurance", "tax", "interest"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Rent", charges: "Maintenance charges", deposit: "Security deposit", maintenance: "Repairs", insurance: "Insurance", tax: "Property tax", utilities: "Utilities", management: "Management", other: "Other" },
  },
  SG: {
    country: "SG", fiscalYearStart: "01-01", currency: "SGD", currencySymbol: "S$",
    vatApplicable: false, vatRates: { standard: 9, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "1-2 months",
    capitalGainsTax: { rate: 0 },
    deductibleCategories: ["maintenance", "insurance", "management", "interest"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Rent", charges: "Fees", deposit: "Security deposit", maintenance: "Repairs", insurance: "Insurance", tax: "Property tax", utilities: "Utilities", management: "Management", other: "Other" },
  },
  SA: {
    country: "SA", fiscalYearStart: "01-01", currency: "SAR", currencySymbol: "SAR",
    vatApplicable: true, vatRates: { standard: 15, rental: 15 },
    rentalIncomeTax: { type: "exempt" },
    deductibleCategories: ["maintenance", "management"],
    propertyTax: false, invoiceRequired: true, reportingFrequency: "quarterly",
    categoryLabels: { rent: "Rent", charges: "Fees", deposit: "Deposit", maintenance: "Maintenance", insurance: "Insurance", management: "Management", other: "Other" },
  },
  TR: {
    country: "TR", fiscalYearStart: "01-01", currency: "TRY", currencySymbol: "₺",
    vatApplicable: false, vatRates: { standard: 20, rental: 0 },
    rentalIncomeTax: { type: "progressive" }, depositCap: "3 aylık kira",
    capitalGainsTax: { rate: 0, exemptionYears: 5 },
    deductibleCategories: ["maintenance", "insurance", "tax", "management"],
    propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
    categoryLabels: { rent: "Kira", charges: "Aidat", deposit: "Depozito", maintenance: "Bakım", insurance: "Sigorta", tax: "Vergi", utilities: "Faturalar", management: "Yönetim", other: "Diğer" },
  },
};

// Fallback: if country not found, return a generic international set
const DEFAULT_RULES: CountryAccountingRules = {
  country: "INT", fiscalYearStart: "01-01", currency: "EUR", currencySymbol: "€",
  vatApplicable: false, vatRates: { standard: 0, rental: 0 },
  rentalIncomeTax: { type: "progressive" },
  deductibleCategories: ["insurance", "maintenance", "management", "tax", "utilities"],
  propertyTax: true, invoiceRequired: false, reportingFrequency: "annual",
  categoryLabels: { rent: "Rent", charges: "Charges", deposit: "Deposit", maintenance: "Maintenance", insurance: "Insurance", tax: "Taxes", utilities: "Utilities", management: "Management", booking: "Short-term", other: "Other" },
};

export function getAccountingRules(countryCode: string): CountryAccountingRules {
  return rules[countryCode] || DEFAULT_RULES;
}

export function getAllAccountingRules(): Record<string, CountryAccountingRules> {
  return rules;
}
