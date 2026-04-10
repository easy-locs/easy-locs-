/**
 * Global nationality dataset.
 * Centralized, searchable, reusable across onboarding/settings/forms.
 */
export interface Nationality {
  country_code: string;
  name: string;
}

export const NATIONALITIES: Nationality[] = [
  { country_code: "AE", name: "Emirati" },
  { country_code: "AF", name: "Afghan" },
  { country_code: "AL", name: "Albanian" },
  { country_code: "DZ", name: "Algerian" },
  { country_code: "AR", name: "Argentine" },
  { country_code: "AU", name: "Australian" },
  { country_code: "AT", name: "Austrian" },
  { country_code: "BH", name: "Bahraini" },
  { country_code: "BD", name: "Bangladeshi" },
  { country_code: "BE", name: "Belgian" },
  { country_code: "BR", name: "Brazilian" },
  { country_code: "CA", name: "Canadian" },
  { country_code: "CL", name: "Chilean" },
  { country_code: "CN", name: "Chinese" },
  { country_code: "CO", name: "Colombian" },
  { country_code: "CI", name: "Ivorian" },
  { country_code: "HR", name: "Croatian" },
  { country_code: "CZ", name: "Czech" },
  { country_code: "DK", name: "Danish" },
  { country_code: "EG", name: "Egyptian" },
  { country_code: "ET", name: "Ethiopian" },
  { country_code: "FI", name: "Finnish" },
  { country_code: "FR", name: "French" },
  { country_code: "DE", name: "German" },
  { country_code: "GR", name: "Greek" },
  { country_code: "HK", name: "Hong Konger" },
  { country_code: "HU", name: "Hungarian" },
  { country_code: "IN", name: "Indian" },
  { country_code: "ID", name: "Indonesian" },
  { country_code: "IQ", name: "Iraqi" },
  { country_code: "IR", name: "Iranian" },
  { country_code: "IE", name: "Irish" },
  { country_code: "IT", name: "Italian" },
  { country_code: "JP", name: "Japanese" },
  { country_code: "JO", name: "Jordanian" },
  { country_code: "KE", name: "Kenyan" },
  { country_code: "KR", name: "Korean" },
  { country_code: "KW", name: "Kuwaiti" },
  { country_code: "LB", name: "Lebanese" },
  { country_code: "LY", name: "Libyan" },
  { country_code: "MY", name: "Malaysian" },
  { country_code: "MX", name: "Mexican" },
  { country_code: "MA", name: "Moroccan" },
  { country_code: "NL", name: "Dutch" },
  { country_code: "NZ", name: "New Zealander" },
  { country_code: "NG", name: "Nigerian" },
  { country_code: "NO", name: "Norwegian" },
  { country_code: "OM", name: "Omani" },
  { country_code: "PK", name: "Pakistani" },
  { country_code: "PS", name: "Palestinian" },
  { country_code: "PH", name: "Filipino" },
  { country_code: "PL", name: "Polish" },
  { country_code: "PT", name: "Portuguese" },
  { country_code: "QA", name: "Qatari" },
  { country_code: "RO", name: "Romanian" },
  { country_code: "RU", name: "Russian" },
  { country_code: "SA", name: "Saudi" },
  { country_code: "SN", name: "Senegalese" },
  { country_code: "SG", name: "Singaporean" },
  { country_code: "ZA", name: "South African" },
  { country_code: "ES", name: "Spanish" },
  { country_code: "LK", name: "Sri Lankan" },
  { country_code: "SD", name: "Sudanese" },
  { country_code: "SE", name: "Swedish" },
  { country_code: "CH", name: "Swiss" },
  { country_code: "SY", name: "Syrian" },
  { country_code: "TW", name: "Taiwanese" },
  { country_code: "TH", name: "Thai" },
  { country_code: "TN", name: "Tunisian" },
  { country_code: "TR", name: "Turkish" },
  { country_code: "UG", name: "Ugandan" },
  { country_code: "UA", name: "Ukrainian" },
  { country_code: "GB", name: "British" },
  { country_code: "US", name: "American" },
  { country_code: "VN", name: "Vietnamese" },
  { country_code: "YE", name: "Yemeni" },
];

/** Search nationalities by name or country code */
export function searchNationalities(query: string): Nationality[] {
  const q = query.toLowerCase().trim();
  if (q.length < 1) return [];
  return NATIONALITIES.filter(
    (n) => n.name.toLowerCase().includes(q) || n.country_code.toLowerCase().includes(q)
  ).slice(0, 20);
}
