/**
 * Global country dataset — ISO 3166-1
 * Centralized, searchable, reusable across onboarding/settings/forms.
 */
export interface Country {
  code: string;
  name: string;
  dialCode: string;
  currency: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", currency: "AED", flag: "🇦🇪" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", currency: "AFN", flag: "🇦🇫" },
  { code: "AL", name: "Albania", dialCode: "+355", currency: "ALL", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", dialCode: "+213", currency: "DZD", flag: "🇩🇿" },
  { code: "AR", name: "Argentina", dialCode: "+54", currency: "ARS", flag: "🇦🇷" },
  { code: "AU", name: "Australia", dialCode: "+61", currency: "AUD", flag: "🇦🇺" },
  { code: "AT", name: "Austria", dialCode: "+43", currency: "EUR", flag: "🇦🇹" },
  { code: "BH", name: "Bahrain", dialCode: "+973", currency: "BHD", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", currency: "BDT", flag: "🇧🇩" },
  { code: "BE", name: "Belgium", dialCode: "+32", currency: "EUR", flag: "🇧🇪" },
  { code: "BR", name: "Brazil", dialCode: "+55", currency: "BRL", flag: "🇧🇷" },
  { code: "CA", name: "Canada", dialCode: "+1", currency: "CAD", flag: "🇨🇦" },
  { code: "CL", name: "Chile", dialCode: "+56", currency: "CLP", flag: "🇨🇱" },
  { code: "CN", name: "China", dialCode: "+86", currency: "CNY", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", dialCode: "+57", currency: "COP", flag: "🇨🇴" },
  { code: "HR", name: "Croatia", dialCode: "+385", currency: "EUR", flag: "🇭🇷" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", currency: "CZK", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", dialCode: "+45", currency: "DKK", flag: "🇩🇰" },
  { code: "EG", name: "Egypt", dialCode: "+20", currency: "EGP", flag: "🇪🇬" },
  { code: "FI", name: "Finland", dialCode: "+358", currency: "EUR", flag: "🇫🇮" },
  { code: "FR", name: "France", dialCode: "+33", currency: "EUR", flag: "🇫🇷" },
  { code: "DE", name: "Germany", dialCode: "+49", currency: "EUR", flag: "🇩🇪" },
  { code: "GR", name: "Greece", dialCode: "+30", currency: "EUR", flag: "🇬🇷" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", currency: "HKD", flag: "🇭🇰" },
  { code: "HU", name: "Hungary", dialCode: "+36", currency: "HUF", flag: "🇭🇺" },
  { code: "IN", name: "India", dialCode: "+91", currency: "INR", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", dialCode: "+62", currency: "IDR", flag: "🇮🇩" },
  { code: "IQ", name: "Iraq", dialCode: "+964", currency: "IQD", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", dialCode: "+353", currency: "EUR", flag: "🇮🇪" },
  { code: "IL", name: "Israel", dialCode: "+972", currency: "ILS", flag: "🇮🇱" },
  { code: "IT", name: "Italy", dialCode: "+39", currency: "EUR", flag: "🇮🇹" },
  { code: "JP", name: "Japan", dialCode: "+81", currency: "JPY", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", dialCode: "+962", currency: "JOD", flag: "🇯🇴" },
  { code: "KE", name: "Kenya", dialCode: "+254", currency: "KES", flag: "🇰🇪" },
  { code: "KW", name: "Kuwait", dialCode: "+965", currency: "KWD", flag: "🇰🇼" },
  { code: "LB", name: "Lebanon", dialCode: "+961", currency: "LBP", flag: "🇱🇧" },
  { code: "MY", name: "Malaysia", dialCode: "+60", currency: "MYR", flag: "🇲🇾" },
  { code: "MX", name: "Mexico", dialCode: "+52", currency: "MXN", flag: "🇲🇽" },
  { code: "MA", name: "Morocco", dialCode: "+212", currency: "MAD", flag: "🇲🇦" },
  { code: "NL", name: "Netherlands", dialCode: "+31", currency: "EUR", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", currency: "NZD", flag: "🇳🇿" },
  { code: "NG", name: "Nigeria", dialCode: "+234", currency: "NGN", flag: "🇳🇬" },
  { code: "NO", name: "Norway", dialCode: "+47", currency: "NOK", flag: "🇳🇴" },
  { code: "OM", name: "Oman", dialCode: "+968", currency: "OMR", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", dialCode: "+92", currency: "PKR", flag: "🇵🇰" },
  { code: "PH", name: "Philippines", dialCode: "+63", currency: "PHP", flag: "🇵🇭" },
  { code: "PL", name: "Poland", dialCode: "+48", currency: "PLN", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", dialCode: "+351", currency: "EUR", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", dialCode: "+974", currency: "QAR", flag: "🇶🇦" },
  { code: "RO", name: "Romania", dialCode: "+40", currency: "RON", flag: "🇷🇴" },
  { code: "RU", name: "Russia", dialCode: "+7", currency: "RUB", flag: "🇷🇺" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", currency: "SAR", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", dialCode: "+221", currency: "XOF", flag: "🇸🇳" },
  { code: "SG", name: "Singapore", dialCode: "+65", currency: "SGD", flag: "🇸🇬" },
  { code: "ZA", name: "South Africa", dialCode: "+27", currency: "ZAR", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", dialCode: "+82", currency: "KRW", flag: "🇰🇷" },
  { code: "ES", name: "Spain", dialCode: "+34", currency: "EUR", flag: "🇪🇸" },
  { code: "SE", name: "Sweden", dialCode: "+46", currency: "SEK", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", currency: "CHF", flag: "🇨🇭" },
  { code: "TH", name: "Thailand", dialCode: "+66", currency: "THB", flag: "🇹🇭" },
  { code: "TN", name: "Tunisia", dialCode: "+216", currency: "TND", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", dialCode: "+90", currency: "TRY", flag: "🇹🇷" },
  { code: "UA", name: "Ukraine", dialCode: "+380", currency: "UAH", flag: "🇺🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", currency: "GBP", flag: "🇬🇧" },
  { code: "US", name: "United States", dialCode: "+1", currency: "USD", flag: "🇺🇸" },
  { code: "VN", name: "Vietnam", dialCode: "+84", currency: "VND", flag: "🇻🇳" },
];

/** Search countries by name or code */
export function searchCountries(query: string): Country[] {
  if (!query.trim()) return COUNTRIES;
  const q = query.toLowerCase().trim();
  return COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q
  );
}

/** Get country by ISO code */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

/** Get currency for a country code */
export function getCurrencyForCountry(code: string): string {
  return getCountryByCode(code)?.currency ?? "USD";
}

/** Get dial code for a country */
export function getDialCode(code: string): string {
  return getCountryByCode(code)?.dialCode ?? "+1";
}
