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

  // Try matching by name
  for (const entry of Object.values(COUNTRY_MAP)) {
    if (entry.name.toLowerCase() === key || entry.code.toLowerCase() === key) return entry;
  }

  return { code: hint.toUpperCase(), name: null, timezone: null, currency: null, language: null };
}
