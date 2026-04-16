/**
 * Internationalization Engine — AV Block
 * i18n with pluralization, date/number formatting, RTL support.
 *
 * Formatting utilities delegate to i18n-utils.ts (single source of truth).
 * This module adds: standalone translation catalog, setLocale/getLocale state,
 * registerTranslations, and Intl.PluralRules-based plural resolution.
 */

import {
  isRTL as _isRTL,
  getDirection as _getDirection,
  formatNumber as _formatNumber,
  formatCurrency as _formatCurrency,
  formatPercent as _formatPercent,
  formatDate as _formatDate,
  formatRelativeTime as _formatRelativeTime,
} from "./i18n-utils";

export type Locale = string;

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
    result = resolvePlural(value, options?.count ?? 1, locale);
  }

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
  if (typeof Intl !== "undefined" && Intl.PluralRules) {
    const pr = new Intl.PluralRules(locale);
    const category = pr.select(count);
    return rules[category as keyof PluralRules] ?? rules.other;
  }
  if (count === 0 && rules.zero) return rules.zero;
  if (count === 1) return rules.one;
  return rules.other;
}

export const isRTL = (locale?: Locale): boolean => _isRTL(locale ?? _currentLocale);
export const getDirection = (locale?: Locale): "ltr" | "rtl" => _getDirection(locale ?? _currentLocale);
export const formatNumber = (value: number, locale?: Locale, options?: Intl.NumberFormatOptions): string =>
  _formatNumber(value, locale ?? _currentLocale, options);
export const formatCurrency = (value: number, currency: string, locale?: Locale): string =>
  _formatCurrency(value, locale ?? _currentLocale, currency);
export const formatPercent = (value: number, locale?: Locale): string =>
  _formatPercent(value, locale ?? _currentLocale);
export const formatDate = (date: Date | string, locale?: Locale, options?: Intl.DateTimeFormatOptions): string =>
  _formatDate(date, locale ?? _currentLocale, options);
export const formatRelativeTime = (date: Date | string, locale?: Locale): string =>
  _formatRelativeTime(date, locale ?? _currentLocale);

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
