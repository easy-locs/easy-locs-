/**
 * geo.country.resolve — Resolves country from multiple signals.
 * ONE thing: produce country code + name from hints.
 */

const COUNTRY_MAP: Record<string, { code: string; name: string; timezone: string; currency: string; language: string }> = {
  ae: { code: "AE", name: "United Arab Emirates", timezone: "Asia/Dubai", currency: "AED", language: "ar" },
  sa: { code: "SA", name: "Saudi Arabia", timezone: "Asia/Riyadh", currency: "SAR", language: "ar" },
  eg: { code: "EG", name: "Egypt", timezone: "Africa/Cairo", currency: "EGP", language: "ar" },
  ma: { code: "MA", name: "Morocco", timezone: "Africa/Casablanca", currency: "MAD", language: "fr" },
  fr: { code: "FR", name: "France", timezone: "Europe/Paris", currency: "EUR", language: "fr" },
  gb: { code: "GB", name: "United Kingdom", timezone: "Europe/London", currency: "GBP", language: "en" },
  tr: { code: "TR", name: "Turkey", timezone: "Europe/Istanbul", currency: "TRY", language: "tr" },
  qa: { code: "QA", name: "Qatar", timezone: "Asia/Qatar", currency: "QAR", language: "ar" },
  om: { code: "OM", name: "Oman", timezone: "Asia/Muscat", currency: "OMR", language: "ar" },
  kw: { code: "KW", name: "Kuwait", timezone: "Asia/Kuwait", currency: "KWD", language: "ar" },
  bh: { code: "BH", name: "Bahrain", timezone: "Asia/Bahrain", currency: "BHD", language: "ar" },
  jo: { code: "JO", name: "Jordan", timezone: "Asia/Amman", currency: "JOD", language: "ar" },
  lb: { code: "LB", name: "Lebanon", timezone: "Asia/Beirut", currency: "LBP", language: "ar" },
  tn: { code: "TN", name: "Tunisia", timezone: "Africa/Tunis", currency: "TND", language: "fr" },
  dz: { code: "DZ", name: "Algeria", timezone: "Africa/Algiers", currency: "DZD", language: "fr" },
  de: { code: "DE", name: "Germany", timezone: "Europe/Berlin", currency: "EUR", language: "de" },
  es: { code: "ES", name: "Spain", timezone: "Europe/Madrid", currency: "EUR", language: "es" },
  it: { code: "IT", name: "Italy", timezone: "Europe/Rome", currency: "EUR", language: "it" },
  pt: { code: "PT", name: "Portugal", timezone: "Europe/Lisbon", currency: "EUR", language: "pt" },
  nl: { code: "NL", name: "Netherlands", timezone: "Europe/Amsterdam", currency: "EUR", language: "nl" },
  be: { code: "BE", name: "Belgium", timezone: "Europe/Brussels", currency: "EUR", language: "fr" },
  ch: { code: "CH", name: "Switzerland", timezone: "Europe/Zurich", currency: "CHF", language: "fr" },
  pl: { code: "PL", name: "Poland", timezone: "Europe/Warsaw", currency: "PLN", language: "pl" },
  se: { code: "SE", name: "Sweden", timezone: "Europe/Stockholm", currency: "SEK", language: "sv" },
  us: { code: "US", name: "United States", timezone: "America/New_York", currency: "USD", language: "en" },
  ca: { code: "CA", name: "Canada", timezone: "America/Toronto", currency: "CAD", language: "en" },
  br: { code: "BR", name: "Brazil", timezone: "America/Sao_Paulo", currency: "BRL", language: "pt" },
  mx: { code: "MX", name: "Mexico", timezone: "America/Mexico_City", currency: "MXN", language: "es" },
  ar: { code: "AR", name: "Argentina", timezone: "America/Buenos_Aires", currency: "ARS", language: "es" },
  co: { code: "CO", name: "Colombia", timezone: "America/Bogota", currency: "COP", language: "es" },
  in: { code: "IN", name: "India", timezone: "Asia/Kolkata", currency: "INR", language: "hi" },
  pk: { code: "PK", name: "Pakistan", timezone: "Asia/Karachi", currency: "PKR", language: "ur" },
  bd: { code: "BD", name: "Bangladesh", timezone: "Asia/Dhaka", currency: "BDT", language: "bn" },
  th: { code: "TH", name: "Thailand", timezone: "Asia/Bangkok", currency: "THB", language: "th" },
  vn: { code: "VN", name: "Vietnam", timezone: "Asia/Ho_Chi_Minh", currency: "VND", language: "vi" },
  id: { code: "ID", name: "Indonesia", timezone: "Asia/Jakarta", currency: "IDR", language: "id" },
  my: { code: "MY", name: "Malaysia", timezone: "Asia/Kuala_Lumpur", currency: "MYR", language: "ms" },
  ph: { code: "PH", name: "Philippines", timezone: "Asia/Manila", currency: "PHP", language: "en" },
  kr: { code: "KR", name: "South Korea", timezone: "Asia/Seoul", currency: "KRW", language: "ko" },
  jp: { code: "JP", name: "Japan", timezone: "Asia/Tokyo", currency: "JPY", language: "ja" },
  cn: { code: "CN", name: "China", timezone: "Asia/Shanghai", currency: "CNY", language: "zh" },
  sg: { code: "SG", name: "Singapore", timezone: "Asia/Singapore", currency: "SGD", language: "en" },
  au: { code: "AU", name: "Australia", timezone: "Australia/Sydney", currency: "AUD", language: "en" },
  nz: { code: "NZ", name: "New Zealand", timezone: "Pacific/Auckland", currency: "NZD", language: "en" },
  ng: { code: "NG", name: "Nigeria", timezone: "Africa/Lagos", currency: "NGN", language: "en" },
  ke: { code: "KE", name: "Kenya", timezone: "Africa/Nairobi", currency: "KES", language: "en" },
  gh: { code: "GH", name: "Ghana", timezone: "Africa/Accra", currency: "GHS", language: "en" },
  za: { code: "ZA", name: "South Africa", timezone: "Africa/Johannesburg", currency: "ZAR", language: "en" },
  et: { code: "ET", name: "Ethiopia", timezone: "Africa/Addis_Ababa", currency: "ETB", language: "am" },
  tz: { code: "TZ", name: "Tanzania", timezone: "Africa/Dar_es_Salaam", currency: "TZS", language: "sw" },
  sn: { code: "SN", name: "Senegal", timezone: "Africa/Dakar", currency: "XOF", language: "fr" },
  ci: { code: "CI", name: "Ivory Coast", timezone: "Africa/Abidjan", currency: "XOF", language: "fr" },
  cm: { code: "CM", name: "Cameroon", timezone: "Africa/Douala", currency: "XAF", language: "fr" },
  ru: { code: "RU", name: "Russia", timezone: "Europe/Moscow", currency: "RUB", language: "ru" },
  ua: { code: "UA", name: "Ukraine", timezone: "Europe/Kyiv", currency: "UAH", language: "uk" },
  pe: { code: "PE", name: "Peru", timezone: "America/Lima", currency: "PEN", language: "es" },
  cl: { code: "CL", name: "Chile", timezone: "America/Santiago", currency: "CLP", language: "es" },
  iq: { code: "IQ", name: "Iraq", timezone: "Asia/Baghdad", currency: "IQD", language: "ar" },
  il: { code: "IL", name: "Israel", timezone: "Asia/Jerusalem", currency: "ILS", language: "he" },
};

export function resolveCountry(hint: string | null | undefined): {
  code: string | null;
  name: string | null;
  timezone: string | null;
  currency: string | null;
  language: string | null;
} {
  if (!hint) return { code: null, name: null, timezone: null, currency: null, language: null };
  const key = hint.trim().toLowerCase();
  const match = COUNTRY_MAP[key];
  if (match) return match;

  for (const entry of Object.values(COUNTRY_MAP)) {
    if (entry.name.toLowerCase() === key || entry.code.toLowerCase() === key) return entry;
  }

  return { code: hint.toUpperCase(), name: null, timezone: null, currency: null, language: null };
}
