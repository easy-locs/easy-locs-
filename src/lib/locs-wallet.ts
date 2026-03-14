/**
 * LOCS Wallet — Configuration and types
 * 1 LOCS = 1 EUR (reference peg)
 * Non-refundable, non-withdrawable, non-exchangeable outside platform
 */

export const LOCS_CONFIG = {
  /** 1 LOCS = 1 EUR */
  PEG_RATE: 1,
  /** Platform spread on FX conversion */
  SPREAD: 0.02,
  /** Minimum purchase in EUR equivalent */
  MIN_PURCHASE_EUR: 5,
  /** Maximum single purchase */
  MAX_PURCHASE_EUR: 10000,
  /** Currency symbol */
  SYMBOL: "LOCS",
  /** Display name */
  DISPLAY_NAME: "LOCS Credits",
} as const;

/** Supported purchase currencies */
export const PURCHASE_CURRENCIES = [
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "MAD", label: "Moroccan Dirham", symbol: "MAD" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼" },
  { code: "SEK", label: "Swedish Krona", symbol: "kr" },
  { code: "PLN", label: "Polish Zloty", symbol: "zł" },
] as const;

export interface LocsTransaction {
  id: string;
  user_id: string;
  type: string;
  direction: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  original_amount: number | null;
  original_currency: string | null;
  fx_rate_used: number | null;
  fx_source: string | null;
  fx_timestamp: string | null;
  margin_applied: number | null;
  thread_id: string | null;
  created_at: string;
}

export function formatLocs(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LOCS`;
}
