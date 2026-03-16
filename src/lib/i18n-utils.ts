/**
 * Advanced i18n utilities
 * - Interpolation: t("hello_{{name}}", { name: "John" })
 * - Pluralization: key_zero / key_one / key_other
 * - Locale-aware formatters for numbers, dates, currencies, relative time
 * - RTL detection & missing key tracking
 */

import type { Locale } from "./i18n";

// ── Interpolation ────────────────────────────────────────────────────

const INTERPOLATION_RE = /\{\{(\w+)\}\}/g;

/**
 * Replace {{var}} placeholders in a translated string.
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars || !template.includes("{{")) return template;
  return template.replace(INTERPOLATION_RE, (_, key) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

// ── Pluralization ────────────────────────────────────────────────────

/**
 * Resolve a plural key based on count.
 * Looks up: key_zero (count=0), key_one (count=1), key_other (fallback).
 * Returns the resolved key suffix or null.
 */
export function getPluralKey(key: string, count: number): string {
  if (count === 0) return `${key}_zero`;
  if (count === 1) return `${key}_one`;
  return `${key}_other`;
}

/**
 * Resolve plural translation with fallback chain:
 * 1. Try exact plural form (key_zero, key_one, key_other)
 * 2. Fall back to key_other
 * 3. Fall back to base key
 */
export function resolvePlural(
  key: string,
  count: number,
  lookup: (k: string) => string | undefined
): string | undefined {
  const pluralKey = getPluralKey(key, count);
  return lookup(pluralKey) || lookup(`${key}_other`) || lookup(key);
}

// ── RTL Detection ────────────────────────────────────────────────────

const RTL_LOCALES: ReadonlySet<string> = new Set(["ar", "he", "fa", "ur"]);

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return isRTL(locale) ? "rtl" : "ltr";
}

// ── Locale-aware Formatters ──────────────────────────────────────────

const formatterCache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function getCachedFormatter<T>(cacheKey: string, factory: () => T): T {
  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(cacheKey, factory() as any);
  }
  return formatterCache.get(cacheKey) as T;
}

export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
  const key = `num:${locale}:${JSON.stringify(options || {})}`;
  const fmt = getCachedFormatter(key, () => new Intl.NumberFormat(locale, options));
  return fmt.format(value);
}

export function formatCurrency(value: number, locale: string, currency: string): string {
  const key = `cur:${locale}:${currency}`;
  const fmt = getCachedFormatter(key, () =>
    new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 })
  );
  return fmt.format(value);
}

export function formatDate(date: Date | string, locale: string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const key = `date:${locale}:${JSON.stringify(options || {})}`;
  const fmt = getCachedFormatter(key, () => new Intl.DateTimeFormat(locale, options));
  return fmt.format(d);
}

export function formatRelativeTime(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const absDiff = Math.abs(diffMs);

  const key = `rel:${locale}`;
  const fmt = getCachedFormatter(key, () => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }));

  if (absDiff < 60_000) return fmt.format(Math.round(diffMs / 1000), "second");
  if (absDiff < 3_600_000) return fmt.format(Math.round(diffMs / 60_000), "minute");
  if (absDiff < 86_400_000) return fmt.format(Math.round(diffMs / 3_600_000), "hour");
  if (absDiff < 2_592_000_000) return fmt.format(Math.round(diffMs / 86_400_000), "day");
  if (absDiff < 31_536_000_000) return fmt.format(Math.round(diffMs / 2_592_000_000), "month");
  return fmt.format(Math.round(diffMs / 31_536_000_000), "year");
}

export function formatPercent(value: number, locale: string): string {
  const key = `pct:${locale}`;
  const fmt = getCachedFormatter(key, () =>
    new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 1 })
  );
  return fmt.format(value);
}

// ── Missing Key Tracker ──────────────────────────────────────────────

const missingKeys = new Map<string, { count: number; locales: Set<string> }>();
let missingKeyReportScheduled = false;

export function trackMissingKey(key: string, locale: string) {
  const entry = missingKeys.get(key);
  if (entry) {
    entry.count++;
    entry.locales.add(locale);
  } else {
    missingKeys.set(key, { count: 1, locales: new Set([locale]) });
  }

  // Batch report to console every 10s max
  if (!missingKeyReportScheduled && missingKeys.size > 0) {
    missingKeyReportScheduled = true;
    setTimeout(() => {
      if (missingKeys.size > 0) {
        const summary = Array.from(missingKeys.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 20)
          .map(([k, v]) => `  ${k} (${v.count}x, locales: ${[...v.locales].join(",")})`)
          .join("\n");
        console.info(`[i18n] Missing keys report (top 20):\n${summary}`);
      }
      missingKeyReportScheduled = false;
    }, 10_000);
  }
}

export function getMissingKeysReport() {
  return Array.from(missingKeys.entries()).map(([key, { count, locales }]) => ({
    key,
    count,
    locales: [...locales],
  }));
}

export function clearMissingKeys() {
  missingKeys.clear();
}
