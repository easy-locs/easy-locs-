import { COUNTRY_CURRENCY_MAP } from "@/lib/geo/country-currency-map";

export const WALLET_FALLBACK_CURRENCY = "EUR";

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
