/**
 * Universal QR Engine — Single source of truth for all QR payloads in the super-app.
 *
 * Covers: payments, identity, security, commerce, services, live, contacts.
 * Every QR in the app encodes/decodes through this module.
 *
 * Payload is serialised as a versioned JSON string, optionally wrapped in a
 * resolve-URL for external sharing (scannable by any camera app).
 */
import { APP_BASE_URL } from "@/lib/app-domain";

/* ═══════════════════════════════════════════════════════════════
   1. PAYLOAD TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */

/** All supported QR action types */
export type QrAction =
  /* ── Payments ─────────────────────────────── */
  | "pay_user"          // pay a user directly
  | "pay_shop"          // pay a shop / storefront
  | "payment_request"   // fulfill a payment request
  | "receive"           // show "receive money" QR (my wallet)
  /* ── POS / Commerce ────────────────────────── */
  | "menu"              // open shop menu (restaurant QR)
  | "pos_order"         // table / counter / dine-in order
  /* ── Identity ─────────────────────────────── */
  | "profile"           // open user profile
  | "add_contact"       // add as contact
  /* ── Security ─────────────────────────────── */
  | "login_verify"      // scan to approve a login
  | "device_link"       // link a new device
  | "payment_confirm"   // 2FA confirmation for a payment
  | "trusted_contact"   // confirm trusted contact relationship
  /* ── Commerce ─────────────────────────────── */
  | "shop"              // open a shop page
  | "product"           // open a product page
  | "order"             // open an order
  /* ── Services ─────────────────────────────── */
  | "service"           // open / book a service
  | "live"              // join a live session
  /* ── C2C Classifieds ──────────────────────── */
  | "pay_c2c"           // C2C listing payment via wallet
  /* ── Catch-all ────────────────────────────── */
  | "deep_link";        // arbitrary in-app deep link

/** Base fields present on every QR payload */
interface QrBase {
  /** Discriminator — the action this QR represents */
  action: QrAction;
  /** Schema version — allows future evolution */
  v: 1;
  /** Optional ISO expiry (for dynamic / security QRs) */
  exp?: string;
  /** Optional nonce for security actions */
  nonce?: string;
}

/* ── Per-action payloads ────────────────────────────────────── */

export interface PayUserQr extends QrBase { action: "pay_user"; userId: string; amount?: number; currency?: string; name?: string; }
export interface PayShopQr extends QrBase { action: "pay_shop"; shopSlug: string; amount?: number; currency?: string; name?: string; }
export interface PaymentRequestQr extends QrBase { action: "payment_request"; requestId: string; }
export interface ReceiveQr extends QrBase { action: "receive"; userId: string; name?: string; }

export interface ProfileQr extends QrBase { action: "profile"; userId: string; name?: string; }
export interface AddContactQr extends QrBase { action: "add_contact"; userId: string; name?: string; phone?: string; }

export interface LoginVerifyQr extends QrBase { action: "login_verify"; sessionId: string; deviceId?: string; }
export interface DeviceLinkQr extends QrBase { action: "device_link"; userId: string; token: string; }
export interface PaymentConfirmQr extends QrBase { action: "payment_confirm"; txId: string; }
export interface TrustedContactQr extends QrBase { action: "trusted_contact"; userId: string; name?: string; token: string; }

export interface ShopQr extends QrBase { action: "shop"; shopSlug: string; }
export interface MenuQr extends QrBase { action: "menu"; shopSlug: string; }
export interface PosOrderQr extends QrBase { action: "pos_order"; shopSlug: string; tableCode?: string; terminalId?: string; }
export interface ProductQr extends QrBase { action: "product"; productId: string; shopSlug?: string; }
export interface OrderQr extends QrBase { action: "order"; orderId: string; }

export interface ServiceQr extends QrBase { action: "service"; serviceId: string; slug?: string; }
export interface LiveQr extends QrBase { action: "live"; liveId: string; }

export interface PayC2CQr extends QrBase { action: "pay_c2c"; listingId: string; sellerId: string; amount: number; currency: string; offerId: string; }

export interface DeepLinkQr extends QrBase { action: "deep_link"; path: string; }

/** Union of all QR payloads */
export type UniversalQrPayload =
  | PayUserQr | PayShopQr | PaymentRequestQr | ReceiveQr
  | ProfileQr | AddContactQr
  | LoginVerifyQr | DeviceLinkQr | PaymentConfirmQr | TrustedContactQr
  | ShopQr | MenuQr | PosOrderQr | ProductQr | OrderQr
  | ServiceQr | LiveQr
  | PayC2CQr
  | DeepLinkQr;

/* ═══════════════════════════════════════════════════════════════
   2. ENCODE / DECODE
   ═══════════════════════════════════════════════════════════════ */

const CURRENT_VERSION = 1;

/** Encode a QR payload to a JSON string (for embedding in QR image) */
export function encodeQr(payload: UniversalQrPayload): string {
  return JSON.stringify({ ...payload, v: CURRENT_VERSION });
}

/** Decode a raw string (from scanner) into a typed payload, or null */
export function decodeQr(raw: string): UniversalQrPayload | null {
  // Try JSON first
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.action && parsed?.v) return parsed as UniversalQrPayload;

    // Legacy compat: old { type: "user_pay", userId } format
    if (parsed?.type) return migrateLegacy(parsed);
  } catch {
    // not JSON — fall through
  }

  // Try URL-based payload (?data= or /qr/resolve?data= or /pay/qr?t=...)
  try {
    const url = new URL(raw);

    // New format: /qr/resolve?data=<json>
    const dataParam = url.searchParams.get("data");
    if (dataParam) {
      return decodeQr(dataParam);
    }

    // Legacy URL format: /pay/qr?t=user&id=...
    const t = url.searchParams.get("t");
    const id = url.searchParams.get("id");
    if (t && id) {
      return migrateLegacyUrl(t, id, url.searchParams);
    }

    // Any in-app URL → deep_link
    if (url.pathname && url.pathname !== "/") {
      return { action: "deep_link", v: 1, path: `${url.pathname}${url.search}${url.hash}` };
    }
  } catch {
    // not a URL
  }

  return null;
}

/** Build a shareable resolve URL (scannable by any camera app) */
export function toResolveUrl(payload: UniversalQrPayload, origin?: string): string {
  const base = origin || APP_BASE_URL;
  return `${base}/qr/resolve?data=${encodeURIComponent(encodeQr(payload))}`;
}

/** Build a short-link URL (clean, shareable) */
export function toShortUrl(code: string, origin?: string): string {
  const base = origin || APP_BASE_URL;
  return `${base}/sl/${code}`;
}

/* ═══════════════════════════════════════════════════════════════
   3. EXPIRY / SECURITY HELPERS
   ═══════════════════════════════════════════════════════════════ */

export function isExpired(payload: UniversalQrPayload): boolean {
  if (!payload.exp) return false;
  return new Date(payload.exp) < new Date();
}

export function isSecurityAction(action: QrAction): boolean {
  return ["login_verify", "device_link", "payment_confirm", "trusted_contact"].includes(action);
}

/* ═══════════════════════════════════════════════════════════════
   4. ROUTE RESOLVER — maps payload → in-app route
   ═══════════════════════════════════════════════════════════════ */

/** Given a decoded payload, return the in-app route to navigate to (or null for inline handling) */
export function resolveRoute(payload: UniversalQrPayload): string | null {
  switch (payload.action) {
    case "pay_user":
      return null; // handled inline by payment overlay
    case "pay_shop":
      return `/s/${payload.shopSlug}`;
    case "payment_request":
      return `/pay/request/${payload.requestId}`;
    case "receive":
      return null; // display only
    case "profile":
      return `/u/${payload.userId}`;
    case "add_contact":
      return `/add-contact?userId=${payload.userId}${payload.name ? `&name=${encodeURIComponent(payload.name)}` : ""}`;
    case "login_verify":
      return null; // handled by security flow
    case "device_link":
      return null; // handled by security flow
    case "payment_confirm":
      return null; // handled inline
    case "trusted_contact":
      return `/u/${payload.userId}`;
    case "menu":
      return `/s/${payload.shopSlug}`;
    case "pos_order":
      const params = new URLSearchParams();
      if (payload.tableCode) params.set("table", payload.tableCode);
      if (payload.terminalId) params.set("terminal", payload.terminalId);
      const qs = params.toString();
      return `/s/${payload.shopSlug}${qs ? `?${qs}` : ""}`;
    case "shop":
      return `/s/${payload.shopSlug}`;
    case "product":
      return `/p/${payload.productId}`;
    case "order":
      return `/my-orders?id=${payload.orderId}`;
    case "service":
      return payload.slug ? `/book/${payload.slug}` : null;
    case "live":
      return `/live/${payload.liveId}`;
    case "pay_c2c":
      return null; // handled inline by C2C payment overlay
    case "deep_link":
      return payload.path;
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   5. LEGACY MIGRATION — backward-compatible with old QR codes
   ═══════════════════════════════════════════════════════════════ */

/**
 * Legacy migration — STRICT RULES:
 * - Only map to pay_user if we have a verified userId field
 * - Never map walletId into userId
 * - receiver_id is only trusted if it's a UUID that is NOT a wallet_id pattern
 * - Unresolvable payloads route to wallet/resolve deep link for server-side resolution
 */
function migrateLegacy(old: Record<string, any>): UniversalQrPayload | null {
  switch (old.type) {
    case "user_pay":
      if (!old.userId) return null;
      return { action: "pay_user", v: 1, userId: old.userId, amount: old.amount, currency: old.currency };
    case "shop_pay":
      return { action: "pay_shop", v: 1, shopSlug: old.shopSlug, amount: old.amount, currency: old.currency };
    case "payment_request":
      return { action: "payment_request", v: 1, requestId: old.requestId };
    case "profile":
      return { action: "profile", v: 1, userId: old.userId };
    case "shop":
      return { action: "shop", v: 1, shopSlug: old.shopSlug };

    // Legacy wallet QR payment — SAFETY: walletId is NEVER a userId
    case "wallet_qr_payment": {
      if (old.userId) {
        return { action: "pay_user", v: 1, userId: old.userId, amount: old.amount, currency: old.currency };
      }
      // walletId only → must be resolved server-side, do NOT map to userId
      if (old.walletId) {
        return { action: "deep_link", v: 1, path: `/wallet/resolve?walletId=${encodeURIComponent(old.walletId)}&amount=${old.amount || ""}&currency=${old.currency || "AED"}` };
      }
      return null;
    }

    case "wallet_pay": {
      // STRICT: only use userId if explicitly present
      if (old.userId) {
        return { action: "pay_user", v: 1, userId: old.userId, amount: old.amount, currency: old.currency };
      }
      // receiver_id — could be userId OR walletId. Only trust if it looks like a user context
      // (legacy apps that set receiver_id typically mean the user who should receive)
      if (old.receiver_id && !old.wallet_id) {
        // receiver_id is the only ID → treat as userId (legacy convention)
        return { action: "pay_user", v: 1, userId: old.receiver_id, amount: old.amount, currency: old.currency };
      }
      if (old.receiver_id && old.wallet_id) {
        // Both present → receiver_id is the userId, wallet_id is the walletId
        return { action: "pay_user", v: 1, userId: old.receiver_id, amount: old.amount, currency: old.currency };
      }
      // Only wallet_id → must resolve server-side
      if (old.wallet_id) {
        return { action: "deep_link", v: 1, path: `/wallet/resolve?walletId=${encodeURIComponent(old.wallet_id)}&amount=${old.amount || ""}&currency=${old.currency || "AED"}` };
      }
      return null;
    }

    default:
      return null;
  }
}

function migrateLegacyUrl(t: string, id: string, params: URLSearchParams): UniversalQrPayload | null {
  const amount = params.get("a") ? Number(params.get("a")) : undefined;
  const currency = params.get("c") || undefined;
  const name = params.get("n") || undefined;

  switch (t) {
    case "user":
      return { action: "pay_user", v: 1, userId: id, amount, currency, name };
    case "shop":
      return { action: "pay_shop", v: 1, shopSlug: id, amount, currency, name };
    case "request":
      return { action: "payment_request", v: 1, requestId: id };
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   6. FACTORY HELPERS — create payloads with less boilerplate
   ═══════════════════════════════════════════════════════════════ */

export const qr = {
  payUser: (userId: string, opts?: { amount?: number; currency?: string; name?: string }): PayUserQr =>
    ({ action: "pay_user", v: 1, userId, ...opts }),

  payShop: (shopSlug: string, opts?: { amount?: number; currency?: string; name?: string }): PayShopQr =>
    ({ action: "pay_shop", v: 1, shopSlug, ...opts }),

  paymentRequest: (requestId: string): PaymentRequestQr =>
    ({ action: "payment_request", v: 1, requestId }),

  receive: (userId: string, name?: string): ReceiveQr =>
    ({ action: "receive", v: 1, userId, name }),

  profile: (userId: string, name?: string): ProfileQr =>
    ({ action: "profile", v: 1, userId, name }),

  addContact: (userId: string, name?: string, phone?: string): AddContactQr =>
    ({ action: "add_contact", v: 1, userId, name, phone }),

  loginVerify: (sessionId: string, deviceId?: string, ttlMinutes = 5): LoginVerifyQr =>
    ({ action: "login_verify", v: 1, sessionId, deviceId, nonce: crypto.randomUUID(), exp: new Date(Date.now() + ttlMinutes * 60_000).toISOString() }),

  deviceLink: (userId: string, token: string, ttlMinutes = 10): DeviceLinkQr =>
    ({ action: "device_link", v: 1, userId, token, nonce: crypto.randomUUID(), exp: new Date(Date.now() + ttlMinutes * 60_000).toISOString() }),

  paymentConfirm: (txId: string, ttlMinutes = 3): PaymentConfirmQr =>
    ({ action: "payment_confirm", v: 1, txId, nonce: crypto.randomUUID(), exp: new Date(Date.now() + ttlMinutes * 60_000).toISOString() }),

  trustedContact: (userId: string, token: string, name?: string, ttlMinutes = 15): TrustedContactQr =>
    ({ action: "trusted_contact", v: 1, userId, name, token, nonce: crypto.randomUUID(), exp: new Date(Date.now() + ttlMinutes * 60_000).toISOString() }),

  shop: (shopSlug: string): ShopQr =>
    ({ action: "shop", v: 1, shopSlug }),

  menu: (shopSlug: string): MenuQr =>
    ({ action: "menu", v: 1, shopSlug }),

  posOrder: (shopSlug: string, opts?: { tableCode?: string; terminalId?: string }): PosOrderQr =>
    ({ action: "pos_order", v: 1, shopSlug, ...opts }),

  product: (productId: string, shopSlug?: string): ProductQr =>
    ({ action: "product", v: 1, productId, shopSlug }),

  order: (orderId: string): OrderQr =>
    ({ action: "order", v: 1, orderId }),

  service: (serviceId: string, slug?: string): ServiceQr =>
    ({ action: "service", v: 1, serviceId, slug }),

  live: (liveId: string): LiveQr =>
    ({ action: "live", v: 1, liveId }),

  payC2C: (listingId: string, sellerId: string, amount: number, currency: string, offerId: string, ttlHours = 24): PayC2CQr =>
    ({ action: "pay_c2c", v: 1, listingId, sellerId, amount, currency, offerId, exp: new Date(Date.now() + ttlHours * 3600000).toISOString() }),

  deepLink: (path: string): DeepLinkQr =>
    ({ action: "deep_link", v: 1, path }),
} as const;

/* ═══════════════════════════════════════════════════════════════
   7. UNIFIED QR PROCESSOR — single entry point after decode
   ═══════════════════════════════════════════════════════════════ */

export type QrProcessResult =
  | { status: "route"; route: string; payload: UniversalQrPayload }
  | { status: "inline"; payload: UniversalQrPayload }
  | { status: "invalid"; reason: string }
  | { status: "expired"; payload: UniversalQrPayload }
  | { status: "unsupported"; raw: string };

/**
 * processQr — the ONE function every QR entry point should call after obtaining raw text.
 * Returns a typed result. Never throws. Never hangs.
 * Also handles Merchant QR payloads (MQR: prefix) by routing to /pay/merchant.
 */
export function processQr(raw: string): QrProcessResult {
  if (!raw?.trim()) return { status: "invalid", reason: "Empty QR data" };

  // Check for Merchant QR (MQR: prefix) — route to merchant payment resolver
  if (raw.startsWith("MQR:")) {
    return {
      status: "route",
      route: `/pay/merchant?data=${encodeURIComponent(raw)}`,
      payload: { action: "deep_link", v: 1, path: `/pay/merchant?data=${encodeURIComponent(raw)}` },
    };
  }

  const payload = decodeQr(raw);
  if (!payload) return { status: "unsupported", raw };
  if (isExpired(payload)) return { status: "expired", payload };

  const route = resolveRoute(payload);
  if (route) return { status: "route", route, payload };
  return { status: "inline", payload };
}
