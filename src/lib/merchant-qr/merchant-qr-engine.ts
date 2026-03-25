/**
 * Merchant QR Engine — Generate, encode, decode, validate merchant QR payloads.
 * Integrates with the universal qr-engine for encoding/decoding.
 */
import { encodeQr, qr, type PayShopQr } from "@/lib/qr-engine";
import type { MerchantQrPayload, MerchantQrMode, MerchantPaymentContext, SplitConfig } from "./types";

/* ═══════════════════════════════════════════════════════════════
   1. PAYLOAD GENERATION
   ═══════════════════════════════════════════════════════════════ */

/** Generate a static merchant QR (customer enters amount) */
export function createStaticMerchantQr(opts: {
  merchantId: string;
  walletId: string;
  merchantName: string;
  currency?: string;
  tableCode?: string;
}): MerchantQrPayload {
  return {
    mode: "static",
    merchantId: opts.merchantId,
    walletId: opts.walletId,
    contextType: opts.tableCode ? "table" : "counter",
    currency: opts.currency || "AED",
    openAmount: true,
    merchantName: opts.merchantName,
    tableCode: opts.tableCode,
    signature: generateSignature(opts.merchantId, "static"),
  };
}

/** Generate a dynamic merchant QR (amount pre-set) */
export function createDynamicMerchantQr(opts: {
  merchantId: string;
  walletId: string;
  merchantName: string;
  amount: number;
  currency?: string;
  contextType?: MerchantPaymentContext;
  contextId?: string;
  tableCode?: string;
  ttlMinutes?: number;
}): MerchantQrPayload {
  const ttl = opts.ttlMinutes ?? 30;
  return {
    mode: "dynamic",
    merchantId: opts.merchantId,
    walletId: opts.walletId,
    contextType: opts.contextType || "counter",
    contextId: opts.contextId,
    currency: opts.currency || "AED",
    amount: opts.amount,
    openAmount: false,
    merchantName: opts.merchantName,
    tableCode: opts.tableCode,
    expiresAt: new Date(Date.now() + ttl * 60_000).toISOString(),
    signature: generateSignature(opts.merchantId, "dynamic", opts.amount),
  };
}

/** Generate an agent/driver collection QR */
export function createAgentQr(opts: {
  merchantId: string;
  walletId: string;
  merchantName: string;
  agentId: string;
  amount?: number;
  currency?: string;
  contextType?: MerchantPaymentContext;
  contextId?: string;
  ttlMinutes?: number;
}): MerchantQrPayload {
  const ttl = opts.ttlMinutes ?? 60;
  return {
    mode: "agent",
    merchantId: opts.merchantId,
    walletId: opts.walletId,
    contextType: opts.contextType || "delivery",
    contextId: opts.contextId,
    currency: opts.currency || "AED",
    amount: opts.amount,
    openAmount: !opts.amount,
    merchantName: opts.merchantName,
    agentId: opts.agentId,
    expiresAt: new Date(Date.now() + ttl * 60_000).toISOString(),
    signature: generateSignature(opts.merchantId, "agent", opts.amount),
  };
}

/* ═══════════════════════════════════════════════════════════════
   2. ENCODE / DECODE — bridges to universal QR engine
   ═══════════════════════════════════════════════════════════════ */

const MERCHANT_QR_PREFIX = "MQR:";
const VERSION = 1;

/** Encode merchant QR payload to string for QR image */
export function encodeMerchantQr(payload: MerchantQrPayload): string {
  return MERCHANT_QR_PREFIX + JSON.stringify({ ...payload, _v: VERSION });
}

/** Decode a raw scanned string to MerchantQrPayload, or null */
export function decodeMerchantQr(raw: string): MerchantQrPayload | null {
  if (!raw?.startsWith(MERCHANT_QR_PREFIX)) return null;
  try {
    const json = raw.slice(MERCHANT_QR_PREFIX.length);
    const parsed = JSON.parse(json);
    if (!parsed.merchantId || !parsed.mode) return null;
    // Reject outdated QR versions
    if (parsed._v && parsed._v < VERSION) {
      console.warn("[QR] Rejected outdated QR version:", parsed._v, "current:", VERSION);
      return null;
    }
    // Verify signature exists
    if (!parsed.signature || !parsed.signature.startsWith("mqr_")) {
      console.warn("[QR] Rejected unsigned QR payload");
      return null;
    }
    return parsed as MerchantQrPayload;
  } catch {
    return null;
  }
}

/** Check if raw string is a merchant QR */
export function isMerchantQr(raw: string): boolean {
  return raw?.startsWith(MERCHANT_QR_PREFIX) ?? false;
}

/* ═══════════════════════════════════════════════════════════════
   3. VALIDATION
   ═══════════════════════════════════════════════════════════════ */

export type MerchantQrValidation =
  | { valid: true; payload: MerchantQrPayload }
  | { valid: false; reason: string };

/** Validate a decoded merchant QR payload */
export function validateMerchantQr(payload: MerchantQrPayload): MerchantQrValidation {
  if (!payload.merchantId) return { valid: false, reason: "Missing merchant ID" };
  if (!payload.walletId) return { valid: false, reason: "Missing wallet ID" };
  if (!payload.currency) return { valid: false, reason: "Missing currency" };

  // Check expiry for dynamic/agent QRs
  if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
    return { valid: false, reason: "QR code has expired" };
  }

  // Check amount for dynamic QRs
  if (payload.mode === "dynamic") {
    if (!payload.amount || payload.amount <= 0) {
      return { valid: false, reason: "Dynamic QR must have a valid amount" };
    }
  }

  return { valid: true, payload };
}

/* ═══════════════════════════════════════════════════════════════
   4. SPLIT CALCULATION
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_SPLIT: SplitConfig = {
  platformRate: 0.05,   // 5% platform
  merchantRate: 0.85,   // 85% merchant (no driver)
  driverRate: 0.10,     // 10% driver
};

const NO_DRIVER_SPLIT: SplitConfig = {
  platformRate: 0.05,
  merchantRate: 0.95,
  driverRate: 0,
};

/** Calculate commission splits for a merchant QR payment */
export function calculateSplit(
  amount: number,
  hasDriver: boolean,
  customConfig?: Partial<SplitConfig>,
): { platform: number; merchant: number; driver: number } {
  const config = {
    ...(hasDriver ? DEFAULT_SPLIT : NO_DRIVER_SPLIT),
    ...customConfig,
  };

  const platform = Math.round(amount * config.platformRate * 100) / 100;
  const driver = hasDriver ? Math.round(amount * config.driverRate * 100) / 100 : 0;
  const merchant = Math.round((amount - platform - driver) * 100) / 100;

  return { platform, merchant, driver };
}

/* ═══════════════════════════════════════════════════════════════
   5. ANTI-TAMPER SIGNATURE
   ═══════════════════════════════════════════════════════════════ */

function generateSignature(merchantId: string, mode: string, amount?: number): string {
  const payload = `${merchantId}:${mode}:${amount ?? "open"}:${Date.now()}`;
  // Client-side hash for basic tamper detection (real verification server-side)
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const chr = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `mqr_${Math.abs(hash).toString(36)}`;
}

/* ═══════════════════════════════════════════════════════════════
   6. DUPLICATE PAYMENT PROTECTION
   ═══════════════════════════════════════════════════════════════ */

const recentPayments = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 30_000; // 30 seconds

/** Generate idempotency key for a payment attempt */
export function generateIdempotencyKey(
  senderId: string,
  merchantId: string,
  amount: number,
  contextId?: string,
): string {
  return `${senderId}:${merchantId}:${amount}:${contextId || "none"}`;
}

/** Check if a payment is a duplicate (same params within 30s window) */
export function isDuplicatePayment(key: string): boolean {
  const lastAttempt = recentPayments.get(key);
  if (lastAttempt && Date.now() - lastAttempt < DUPLICATE_WINDOW_MS) {
    return true;
  }
  return false;
}

/** Record a payment attempt */
export function recordPaymentAttempt(key: string): void {
  recentPayments.set(key, Date.now());
  // Cleanup old entries
  if (recentPayments.size > 100) {
    const now = Date.now();
    for (const [k, v] of recentPayments) {
      if (now - v > DUPLICATE_WINDOW_MS * 2) recentPayments.delete(k);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   7. SHAREABLE URL
   ═══════════════════════════════════════════════════════════════ */

/** Build a shareable merchant payment URL */
export function toMerchantPayUrl(payload: MerchantQrPayload, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://easy-locs.lovable.app");
  return `${base}/pay/merchant?data=${encodeURIComponent(encodeMerchantQr(payload))}`;
}
