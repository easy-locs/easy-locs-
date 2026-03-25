/**
 * useStorefrontCurrency — Country-locked currency (no user choice).
 * Currency is determined by the shop's country — no picker, no conversion.
 */
import { useCallback, useMemo } from "react";
import { currencyFromCountry } from "@/lib/currency-engine";

export function useStorefrontCurrency(shopCurrency: string = "AED", shopCountry?: string | null) {
  // Currency is locked to the shop's own currency — never converted
  const displayCurrency = useMemo(() => {
    if (shopCurrency) return shopCurrency;
    return currencyFromCountry(shopCountry);
  }, [shopCurrency, shopCountry]);

  const convert = useCallback((amount: number, _from?: string): number => {
    // No conversion — prices are shown in the shop's native currency
    return amount;
  }, []);

  const formatPrice = useCallback((amount: number, _from?: string): string => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency", currency: displayCurrency,
        minimumFractionDigits: 0, maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${displayCurrency}`;
    }
  }, [displayCurrency]);

  return {
    displayCurrency,
    setDisplayCurrency: () => {}, // no-op — currency is locked
    shopCurrency: displayCurrency,
    convert,
    formatPrice,
    isConverted: false, // never converted
    detectedCurrency: displayCurrency,
    supportedCurrencies: [displayCurrency],
  };
}
