/**
 * Orbit Payments — Type Definitions
 * Smart payment system with QR, in-chat, and context-aware payments.
 */

/** Payment method selection */
export type PaymentMethod = "fiat" | "locs";

/** Supported context types for contextual payments */
export type PaymentContextType =
  | "thread"
  | "listing"
  | "service"
  | "booking"
  | "property"
  | "concierge"
  | "standalone";

/** Payment context linking */
export interface PaymentContext {
  type: PaymentContextType;
  id: string;
  label?: string;
}

/** QR code types */
export type QRType = "static" | "dynamic";

/** Static QR payload — for profiles, businesses, providers */
export interface StaticQRPayload {
  qr_type: "static";
  version: 1;
  recipient_user_id: string;
  recipient_name: string;
  recipient_type: "user" | "business" | "provider" | "store";
  org_id?: string;
  created_at: string;
}

/** Dynamic QR payload — for specific payment requests */
export interface DynamicQRPayload {
  qr_type: "dynamic";
  version: 1;
  recipient_user_id: string;
  recipient_name: string;
  amount: number;
  currency: string;
  locs_equivalent?: number;
  reference_type?: PaymentContextType;
  reference_id?: string;
  description?: string;
  expires_at: string;
  nonce: string; // anti-replay
  signature: string; // HMAC signature
}

export type QRPayload = StaticQRPayload | DynamicQRPayload;

/** FX conversion preview */
export interface FXPreview {
  original_amount: number;
  original_currency: string;
  fx_rate_used: number;
  amount_in_eur: number;
  margin_applied: number;
  spread_amount: number;
  locs_amount: number;
  fx_source: string;
  fx_timestamp: string;
}

/** Smart payment form state */
export interface PaymentFormState {
  recipientUserId: string;
  recipientName: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  description: string;
  context?: PaymentContext;
  threadId?: string;
}

/** Payment action types available in Orbit */
export type OrbitPaymentAction =
  | "pay"
  | "request"
  | "scan_qr"
  | "my_qr"
  | "wallet"
  | "history";

/** Detected currency info */
export interface DetectedCurrency {
  code: string;
  symbol: string;
  name: string;
}

/** Common currencies with symbols */
export const SUPPORTED_CURRENCIES: Record<string, { symbol: string; name: string }> = {
  EUR: { symbol: "€", name: "Euro" },
  USD: { symbol: "$", name: "US Dollar" },
  GBP: { symbol: "£", name: "British Pound" },
  CHF: { symbol: "CHF", name: "Swiss Franc" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  MAD: { symbol: "د.م.", name: "Moroccan Dirham" },
  XOF: { symbol: "CFA", name: "CFA Franc BCEAO" },
  XAF: { symbol: "FCFA", name: "CFA Franc BEAC" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  ZAR: { symbol: "R", name: "South African Rand" },
  TND: { symbol: "DT", name: "Tunisian Dinar" },
  DZD: { symbol: "د.ج", name: "Algerian Dinar" },
  EGP: { symbol: "E£", name: "Egyptian Pound" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  TRY: { symbol: "₺", name: "Turkish Lira" },
  SAR: { symbol: "﷼", name: "Saudi Riyal" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
};
