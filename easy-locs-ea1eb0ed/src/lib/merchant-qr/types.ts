/**
 * Merchant Instant QR Payment — Core types.
 * 3 modes: static, dynamic, agent.
 */

/** The 3 QR payment modes */
export type MerchantQrMode = "static" | "dynamic" | "agent";

/** Context for the payment — what triggered it */
export type MerchantPaymentContext =
  | "counter"        // walk-in counter
  | "table"          // dine-in table
  | "pos"            // POS terminal
  | "invoice"        // linked invoice
  | "order"          // linked order
  | "checkout"       // storefront checkout
  | "delivery"       // delivery collection
  | "field"          // field agent collection
  | "generic";       // open payment

/** Merchant QR payload — extends the universal QR engine */
export interface MerchantQrPayload {
  /** QR mode */
  mode: MerchantQrMode;
  /** Merchant profile ID (storefront_pages.id or merchant_profiles.id) */
  merchantId: string;
  /** Wallet account ID of the merchant */
  walletId: string;
  /** Payment context */
  contextType: MerchantPaymentContext;
  /** Linked entity ID (order, invoice, table, delivery job) */
  contextId?: string;
  /** Currency code */
  currency: string;
  /** Fixed amount (dynamic mode) or undefined (static = open amount) */
  amount?: number;
  /** Whether customer enters amount (static mode) */
  openAmount: boolean;
  /** Expiry ISO string (dynamic/agent QRs) */
  expiresAt?: string;
  /** Merchant display name */
  merchantName: string;
  /** Table / terminal code */
  tableCode?: string;
  /** Agent / driver user ID (agent mode) */
  agentId?: string;
  /** Anti-tamper signature hash */
  signature?: string;
}

/** Result of a merchant QR payment */
export interface MerchantPaymentResult {
  ok: boolean;
  transactionId?: string;
  splitResult?: {
    platform: number;
    merchant: number;
    driver: number;
  };
  receiptId?: string;
  error?: string;
}

/** Split configuration */
export interface SplitConfig {
  platformRate: number;
  merchantRate: number;
  driverRate: number;
}

/** Payment attempt record for duplicate protection */
export interface PaymentAttempt {
  idempotencyKey: string;
  merchantId: string;
  amount: number;
  currency: string;
  contextId?: string;
  timestamp: number;
}
