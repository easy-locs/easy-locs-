/**
 * Internationalization Engine — AV Block
 * i18n with pluralization, date/number formatting, RTL support.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type Locale = string; // e.g. "fr-FR", "en-US", "ar-SA"

export interface PluralRules {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type TranslationValue = string | PluralRules;
export type TranslationDict = Record<string, TranslationValue>;
export type TranslationCatalog = Record<Locale, TranslationDict>;

// ── RTL Detection ───────────────────────────────────────────────────────────

const RTL_LOCALES = new Set([
  "ar", "ar-SA", "ar-EG", "ar-MA", "he", "he-IL", "fa", "fa-IR", "ur", "ur-PK",
]);

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.has(locale) || RTL_LOCALES.has(locale.split("-")[0]);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}

// ── Core Engine ─────────────────────────────────────────────────────────────

let _currentLocale: Locale = "en";
let _fallbackLocale: Locale = "en";
const _catalog: TranslationCatalog = {};

export function setLocale(locale: Locale): void {
  _currentLocale = locale;
}

export function getLocale(): Locale {
  return _currentLocale;
}

export function setFallbackLocale(locale: Locale): void {
  _fallbackLocale = locale;
}

export function registerTranslations(locale: Locale, translations: TranslationDict): void {
  _catalog[locale] = { ...(_catalog[locale] || {}), ...translations };
}

function resolveKey(locale: Locale, key: string): TranslationValue | undefined {
  return _catalog[locale]?.[key];
}

// ── Translate ───────────────────────────────────────────────────────────────

export interface TranslateOptions {
  count?: number;
  params?: Record<string, string | number>;
  locale?: Locale;
}

export function t(key: string, options?: TranslateOptions): string {
  const locale = options?.locale ?? _currentLocale;
  let value = resolveKey(locale, key) ?? resolveKey(_fallbackLocale, key);

  if (value === undefined) return key;

  let result: string;

  if (typeof value === "string") {
    result = value;
  } else {
    // Plural resolution
    result = resolvePlural(value, options?.count ?? 1, locale);
  }

  // Interpolation
  if (options?.params) {
    for (const [paramKey, paramVal] of Object.entries(options.params)) {
      result = result.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"), String(paramVal));
    }
  }
  if (options?.count !== undefined) {
    result = result.replace(/\{\{count\}\}/g, String(options.count));
  }

  return result;
}

function resolvePlural(rules: PluralRules, count: number, locale: Locale): string {
  // Use Intl.PluralRules if available
  if (typeof Intl !== "undefined" && Intl.PluralRules) {
    const pr = new Intl.PluralRules(locale);
    const category = pr.select(count);
    return (rules as any)[category] ?? rules.other;
  }
  // Simple fallback
  if (count === 0 && rules.zero) return rules.zero;
  if (count === 1) return rules.one;
  return rules.other;
}

// ── Number Formatting ───────────────────────────────────────────────────────

export function formatNumber(
  value: number,
  locale?: Locale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale ?? _currentLocale, options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale?: Locale
): string {
  return new Intl.NumberFormat(locale ?? _currentLocale, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatPercent(value: number, locale?: Locale): string {
  return new Intl.NumberFormat(locale ?? _currentLocale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

// ── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(
  date: Date | string,
  locale?: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale ?? _currentLocale, options ?? {
    year: "numeric", month: "long", day: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string, locale?: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const absDiffMs = Math.abs(diffMs);

  if (typeof Intl !== "undefined" && (Intl as any).RelativeTimeFormat) {
    const rtf = new (Intl as any).RelativeTimeFormat(locale ?? _currentLocale, { numeric: "auto" });
    if (absDiffMs < 60_000) return rtf.format(Math.round(diffMs / 1000), "second");
    if (absDiffMs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
    if (absDiffMs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
    return rtf.format(Math.round(diffMs / 86_400_000), "day");
  }

  // Fallback
  const seconds = Math.round(absDiffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// ── Catalog Utilities ───────────────────────────────────────────────────────

export function getAvailableLocales(): Locale[] {
  return Object.keys(_catalog);
}

export function hasTranslation(key: string, locale?: Locale): boolean {
  return resolveKey(locale ?? _currentLocale, key) !== undefined;
}

export function clearCatalog(): void {
  for (const key of Object.keys(_catalog)) {
    delete _catalog[key];
  }
  _currentLocale = "en";
  _fallbackLocale = "en";
}
