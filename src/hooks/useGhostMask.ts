/**
 * useGhostMask — Provides financial data masking when Ghost Mode is active.
 * 
 * When Ghost Mode is active:
 * - Wallet balances show "••••••" instead of real amounts
 * - Transaction amounts are masked
 * - Account names are hidden
 * - Sensitive identifiers (IBAN, email) are redacted
 * 
 * This is a CLIENT-SIDE privacy layer only — it does not affect server data.
 */
import { useMemo } from "react";
import { isGhostModeActive } from "@/lib/app-security";

export interface GhostMaskConfig {
  /** Is ghost mode currently active? */
  isGhost: boolean;
  /** Mask a numeric amount → "••••••" if ghost */
  maskAmount: (amount: number | string | null | undefined, currency?: string) => string;
  /** Mask a name → "••••" if ghost */
  maskName: (name: string | null | undefined) => string;
  /** Mask sensitive string (IBAN, email, etc.) → "••••••••" if ghost */
  maskSensitive: (value: string | null | undefined) => string;
  /** Returns true if the value should be hidden entirely */
  shouldHide: boolean;
}

export function useGhostMask(): GhostMaskConfig {
  const isGhost = useMemo(() => isGhostModeActive(), []);

  const maskAmount = (amount: number | string | null | undefined, currency?: string): string => {
    if (isGhost) return "••••••";
    if (amount == null) return "0";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "0";
    if (currency) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency.toUpperCase(),
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(num);
      } catch {
        return `${num} ${currency}`;
      }
    }
    return num.toLocaleString();
  };

  const maskName = (name: string | null | undefined): string => {
    if (isGhost) return "••••";
    return name || "";
  };

  const maskSensitive = (value: string | null | undefined): string => {
    if (isGhost) return "••••••••";
    return value || "";
  };

  return {
    isGhost,
    maskAmount,
    maskName,
    maskSensitive,
    shouldHide: isGhost,
  };
}
