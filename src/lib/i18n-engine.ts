/**
 * i18n Engine avancé — PASS55 Block AV
 * Pluralization, date/number formatting, RTL support.
 */

// ─── Pluralization ──────────────────────────────────────────────────────
export type PluralForm = "zero" | "one" | "two" | "few" | "many" | "other";
export type PluralRules = Partial<Record<PluralForm, string>>;

/** Get ICU plural category for a locale */
export function getPluralCategory(count: number, locale = "en"): PluralForm {
  try {
    const pr = new Intl.PluralRules(locale);
    return pr.select(count) as PluralForm;
  } catch {
    if (count === 0) return "zero";
    if (count === 1) return "one";
    return "other";
  }
}

/** Resolve a plural string from rules */
export function pluralize(count: number, rules: PluralRules, locale = "en"): string {
  const category = getPluralCategory(count, locale);
  const template = rules[category] ?? rules.other ?? "";
  return template.replace(/\{count\}/g, String(count));
}

// ─── Date Formatting ────────────────────────────────────────────────────
export type DateStyle = "short" | "medium" | "long" | "full" | "relative";

export function formatDate(
  date: Date | string | number,
  style: DateStyle = "medium",
  locale = "en",
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (style === "relative") return formatRelativeTime(d, locale);
  const options: Record<DateStyle, Intl.DateTimeFormatOptions> = {
    short: { day: "2-digit", month: "2-digit", year: "2-digit" },
    medium: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    relative: {},
  };
  return new Intl.DateTimeFormat(locale, options[style]).format(d);
}

export function formatRelativeTime(date: Date, locale = "en"): string {
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiff = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absDiff < 60_000) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absDiff < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absDiff < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (absDiff < 2_592_000_000) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  if (absDiff < 31_536_000_000) return rtf.format(Math.round(diffMs / 2_592_000_000), "month");
  return rtf.format(Math.round(diffMs / 31_536_000_000), "year");
}

// ─── Number Formatting ──────────────────────────────────────────────────
export function formatNumber(
  value: number,
  locale = "en",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  amount: number,
  currency = "EUR",
  locale = "en",
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function formatPercent(value: number, locale = "en", decimals = 0): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompact(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale, { notation: "compact" }).format(value);
}

// ─── RTL Support ────────────────────────────────────────────────────────
const RTL_LOCALES = new Set(["ar", "he", "fa", "ur", "ps", "ku", "sd", "yi"]);

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.has(locale.split("-")[0]);
}

export function getDirection(locale: string): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}

/** Apply direction attributes to document */
export function applyDirection(locale: string): void {
  if (typeof document === "undefined") return;
  const dir = getDirection(locale);
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", locale);
}

// ─── Interpolation ──────────────────────────────────────────────────────
/** Simple string interpolation: "Hello {name}" + {name: "World"} → "Hello World" */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
