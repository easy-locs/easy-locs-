import { COUNTRY_CURRENCY_MAP } from "@/lib/geo/country-currency-map";

export const WALLET_FALLBACK_CURRENCY = "EUR";

// ── Wallet balance thresholds ──────────────────────────────────────────────────
// Centralised here so Wallet pillar and Dashboard can share the same config.

/** Balance below this triggers a critical "will not cover next payment" warning. */
export const WALLET_LOW_BALANCE_CRITICAL = 20;

/** Balance below this triggers a softer "balance is low" reminder. */
export const WALLET_LOW_BALANCE_WARNING = 50;

export function getWalletDefaultCurrency(): string {
  try {
    const stored = localStorage.getItem("app_country");
    if (stored && COUNTRY_CURRENCY_MAP[stored]) {
      return COUNTRY_CURRENCY_MAP[stored];
    }
  } catch {}

  if (typeof navigator !== "undefined") {
    const country = (navigator.language || "").split("-")[1]?.toUpperCase();
    if (country && COUNTRY_CURRENCY_MAP[country]) {
      return COUNTRY_CURRENCY_MAP[country];
    }
  }

  return WALLET_FALLBACK_CURRENCY;
}
