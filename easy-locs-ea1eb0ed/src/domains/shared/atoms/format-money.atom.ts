/**
 * ATOM: formatMoney — Pure currency formatter.
 */
import type { CurrencyCode } from "../canonical-types";

export function formatMoney(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactMoney(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
