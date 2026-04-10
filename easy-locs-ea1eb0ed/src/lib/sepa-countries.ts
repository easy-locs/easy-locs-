/**
 * SEPA country eligibility module.
 * SEPA Direct Debit is only available in SEPA zone countries.
 * This module determines whether SEPA payment methods should be shown
 * for a given property country.
 */

/** All SEPA zone countries (EU + EEA + CH + MC + SM + AD + VA + GB*) */
const SEPA_COUNTRIES = new Set([
  // EU member states
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA (non-EU)
  "IS", "LI", "NO",
  // Other SEPA participants
  "CH", "MC", "SM", "AD", "VA",
  // UK (still SEPA participant post-Brexit for GBP SEPA)
  "GB",
  // French overseas
  "GP", "MQ", "GF", "RE", "YT", "PM", "BL", "MF", "WF", "PF", "NC",
]);

/**
 * Check if a country supports SEPA Direct Debit.
 */
export function isSepaCountry(countryCode: string): boolean {
  return SEPA_COUNTRIES.has(countryCode?.toUpperCase());
}

/**
 * Get the list of all SEPA-eligible country codes.
 */
export function getSepaCountries(): string[] {
  return Array.from(SEPA_COUNTRIES);
}

/**
 * Get available payment methods for a given property country.
 * Returns an array of method IDs that should be shown.
 */
export function getAvailablePaymentMethods(propertyCountry: string): ("card" | "sepa" | "bank_transfer")[] {
  const methods: ("card" | "sepa" | "bank_transfer")[] = ["card", "bank_transfer"];
  if (isSepaCountry(propertyCountry)) {
    methods.splice(1, 0, "sepa"); // Insert SEPA after card
  }
  return methods;
}
