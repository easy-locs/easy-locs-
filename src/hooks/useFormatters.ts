/**
 * useFormatters — locale-aware formatting hook
 * Provides memoized formatters for numbers, dates, currencies, relative time.
 */

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatPercent,
  isRTL,
  getDirection,
} from "@/lib/i18n-utils";

export function useFormatters() {
  const { locale } = useI18n();

  return useMemo(() => ({
    /** Format a number with locale conventions */
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),

    /** Format currency amount */
    currency: (value: number, currency: string) =>
      formatCurrency(value, locale, currency),

    /** Format a date */
    date: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, locale, options),

    /** Short date: "15 mars 2026" */
    shortDate: (date: Date | string) =>
      formatDate(date, locale, { day: "numeric", month: "short", year: "numeric" }),

    /** Long date: "dimanche 15 mars 2026" */
    longDate: (date: Date | string) =>
      formatDate(date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),

    /** Relative time: "il y a 3 jours" */
    relative: (date: Date | string) =>
      formatRelativeTime(date, locale),

    /** Format percentage: 0.75 → "75%" */
    percent: (value: number) =>
      formatPercent(value, locale),

    /** Whether current locale is RTL */
    isRTL: isRTL(locale),

    /** "rtl" or "ltr" */
    direction: getDirection(locale),

    /** Current locale code */
    locale,
  }), [locale]);
}
