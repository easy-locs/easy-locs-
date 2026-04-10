/**
 * ATOM: Me — Pure identity/preferences validators.
 */
const SUPPORTED_LANGUAGES = ["fr", "en", "es", "de", "it", "pt", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isValidLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s-]/g, ""));
}
