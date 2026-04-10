/**
 * usePlatformCurrency — Single hook for currency display across the entire app.
 * Sources: user profile preference → account country → browser locale → EUR fallback.
 * Used by Dashboard, Wallet, Marketplace, PM — ensuring consistency.
 */
import { useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { detectLocalCurrency, formatCurrency } from "@/lib/orbit-payments";
import { SUPPORTED_CURRENCIES } from "@/lib/orbit-payments/types";
import { RATES_TO_EUR } from "@/hooks/useCurrencyConversion";

export function usePlatformCurrency() {
  const { userCurrency, userCountry } = useAuth();

  const detected = useMemo(
    () => detectLocalCurrency({ preferredCurrency: userCurrency || null, accountCountry: userCountry || null }),
    [userCurrency, userCountry]
  );

  const currencyInfo = SUPPORTED_CURRENCIES[detected.code];
  const code = detected.code;
  const symbol = currencyInfo?.symbol || code;
  const rate = RATES_TO_EUR[code] || 1;

  /** Convert EUR (or LOCS, since 1 LOCS = 1 EUR) to local currency */
  const toLocal = useCallback(
    (eurAmount: number): number => {
      if (!rate || rate === 0) return eurAmount;
      return Math.round((eurAmount / rate) * 100) / 100;
    },
    [rate]
  );

  /** Format an amount in the user's local currency */
  const fmtLocal = useCallback(
    (eurAmount: number): string => {
      const localAmount = toLocal(eurAmount);
      try {
        return new Intl.NumberFormat(navigator.language || "fr-FR", {
          style: "currency",
          currency: code,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(localAmount);
      } catch {
        return `${symbol} ${localAmount.toFixed(2)}`;
      }
    },
    [code, symbol, toLocal]
  );

  /** Format LOCS amount */
  const fmtLocs = useCallback(
    (locs: number): string => `${locs.toLocaleString()} LOCS`,
    []
  );

  /** Format amount in a specific currency */
  const fmtCurrency = useCallback(
    (amount: number, cur: string): string => {
      try {
        return new Intl.NumberFormat(navigator.language || "fr-FR", {
          style: "currency",
          currency: cur,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        return `${amount.toLocaleString()} ${cur}`;
      }
    },
    []
  );

  return {
    code,
    symbol,
    rate,
    toLocal,
    fmtLocal,
    fmtLocs,
    fmtCurrency,
    isLocs: code === "EUR", // If user's currency is EUR, LOCS display is identical
  };
}
