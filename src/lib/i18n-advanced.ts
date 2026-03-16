/**
 * Advanced i18n Engine — Locale negotiation, ordinals, list formatting,
 * compact numbers, distance-of-time, and CLDR plural rules.
 * Complements src/lib/i18n-utils.ts.
 */

/* ─── Locale Negotiation ─── */

/** Supported application locales */
export const SUPPORTED_LOCALES = [
  "fr", "en", "es", "de", "pt", "it", "nl", "ar", "he", "fa",
  "tr", "pl", "ro", "cs", "sv", "da", "fi", "nb", "el", "hu",
  "bg", "hr", "sk", "sl", "et", "lv", "lt", "uk", "ru", "ja", "zh",
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

/** RTL locales */
export const RTL_LOCALES = new Set<string>(["ar", "he", "fa", "ur"]);

/**
 * Negotiate best locale from browser preferences.
 * 1. Exact match (fr-FR → fr)
 * 2. Language prefix match (pt-BR → pt)
 * 3. Fallback to default
 */
export function negotiateLocale(
  preferred: readonly string[] = typeof navigator !== "undefined" ? navigator.languages : [],
  fallback: SupportedLocale = "fr"
): SupportedLocale {
  for (const pref of preferred) {
    const exact = pref.toLowerCase() as SupportedLocale;
    if (SUPPORTED_LOCALES.includes(exact)) return exact;

    const prefix = pref.split("-")[0].toLowerCase() as SupportedLocale;
    if (SUPPORTED_LOCALES.includes(prefix)) return prefix;
  }
  return fallback;
}

/** Get BCP-47 locale tag for Intl APIs */
export function toBCP47(locale: SupportedLocale): string {
  const map: Partial<Record<SupportedLocale, string>> = {
    nb: "nb-NO",
    zh: "zh-CN",
  };
  return map[locale] ?? locale;
}

/* ─── CLDR Plural Rules ─── */

/**
 * Get CLDR plural category using native Intl.PluralRules.
 * Returns: "zero" | "one" | "two" | "few" | "many" | "other"
 */
export function getPluralCategory(
  count: number,
  locale: string,
  type: "cardinal" | "ordinal" = "cardinal"
): Intl.LDMLPluralRule {
  const rules = new Intl.PluralRules(locale, { type });
  return rules.select(count);
}

/* ─── Ordinal Formatting ─── */

const ORDINAL_SUFFIXES: Record<string, Record<string, string>> = {
  en: { one: "st", two: "nd", few: "rd", other: "th" },
  fr: { one: "er", other: "e" },
  es: { other: "º" },
  de: { other: "." },
  it: { other: "º" },
  pt: { other: "º" },
};

/** Format a number as an ordinal (1st, 2e, 3º, etc.) */
export function formatOrdinal(n: number, locale: string): string {
  const lang = locale.split("-")[0];
  const suffixes = ORDINAL_SUFFIXES[lang];
  if (!suffixes) return `${n}.`;

  const category = getPluralCategory(n, locale, "ordinal");
  const suffix = suffixes[category] ?? suffixes.other ?? ".";
  return `${n}${suffix}`;
}

/* ─── List Formatting ─── */

/**
 * Format a list of items using Intl.ListFormat.
 * "Alice, Bob, and Charlie" / "Alice, Bob et Charlie"
 */
export function formatList(
  items: string[],
  locale: string,
  type: "conjunction" | "disjunction" = "conjunction"
): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];

  try {
    return new Intl.ListFormat(locale, { style: "long", type }).format(items);
  } catch {
    // Fallback for unsupported
    const sep = type === "conjunction" ? " & " : " / ";
    return items.join(sep);
  }
}

/* ─── Compact Number Formatting ─── */

/**
 * Format numbers in compact notation: 1.2K, 3.5M, etc.
 */
export function formatCompactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

/* ─── Distance of Time ─── */

/**
 * Human-readable time distance: "il y a 5 min", "in 3 days", etc.
 */
export function timeAgo(date: Date | string | number, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : typeof date === "number" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const absDiff = Math.abs(diffMs);
  const sign = diffMs > 0 ? -1 : 1; // past = negative for RelativeTimeFormat

  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "long" });

  if (absDiff < 60_000) return fmt.format(sign * Math.round(absDiff / 1000), "second");
  if (absDiff < 3_600_000) return fmt.format(sign * Math.round(absDiff / 60_000), "minute");
  if (absDiff < 86_400_000) return fmt.format(sign * Math.round(absDiff / 3_600_000), "hour");
  if (absDiff < 2_592_000_000) return fmt.format(sign * Math.round(absDiff / 86_400_000), "day");
  if (absDiff < 31_536_000_000) return fmt.format(sign * Math.round(absDiff / 2_592_000_000), "month");
  return fmt.format(sign * Math.round(absDiff / 31_536_000_000), "year");
}

/* ─── Date Part Extraction ─── */

/** Get localized month name */
export function getMonthName(month: number, locale: string, format: "long" | "short" = "long"): string {
  const d = new Date(2024, month - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: format }).format(d);
}

/** Get localized day name */
export function getDayName(dayIndex: number, locale: string, format: "long" | "short" = "long"): string {
  // dayIndex: 0=Sunday, 1=Monday, ...
  const d = new Date(2024, 0, 7 + dayIndex); // Jan 7, 2024 is a Sunday
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(d);
}

/* ─── Bi-directional Text ─── */

/** Wrap text with Unicode directional markers for mixed content */
export function bidiWrap(text: string, direction: "ltr" | "rtl"): string {
  if (direction === "rtl") return `\u200F${text}\u200F`;
  return `\u200E${text}\u200E`;
}

/** Check if a string contains RTL characters */
export function hasRTLChars(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/* ─── Unit Formatting ─── */

/**
 * Format a value with unit: "5 kilograms", "3 meters", etc.
 */
export function formatUnit(
  value: number,
  unit: string,
  locale: string,
  style: "long" | "short" | "narrow" = "short"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: style,
    } as Intl.NumberFormatOptions).format(value);
  } catch {
    return `${value} ${unit}`;
  }
}

/* ─── Translation Key Helpers ─── */

/** Generate a namespace-qualified key */
export function nsKey(namespace: string, key: string): string {
  return `${namespace}.${key}`;
}

/** Extract namespace from a qualified key */
export function extractNamespace(qualifiedKey: string): { namespace: string; key: string } {
  const dotIndex = qualifiedKey.indexOf(".");
  if (dotIndex === -1) return { namespace: "", key: qualifiedKey };
  return {
    namespace: qualifiedKey.slice(0, dotIndex),
    key: qualifiedKey.slice(dotIndex + 1),
  };
}
