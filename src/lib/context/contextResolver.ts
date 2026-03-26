/**
 * Context Resolver Layer — Resolves business context for any action.
 * Ensures QR scans, wallet actions, Orbit messages, and orders
 * always open the correct destination with full context.
 */

export type ContextType = "qr" | "wallet" | "merchant" | "ride" | "orbit" | "order";

export interface ResolvedContext {
  type: ContextType;
  targetRoute: string;
  params: Record<string, string>;
  meta?: Record<string, unknown>;
}

// ── QR Context ──
export function resolveQrContext(payload: Record<string, string>): ResolvedContext {
  const { type, id, merchant_id, table_id, amount, currency } = payload;

  switch (type) {
    case "menu":
      return {
        type: "qr",
        targetRoute: `/food/restaurant/${merchant_id || id}`,
        params: { merchant_id: merchant_id || id, table_id: table_id || "" },
      };
    case "payment":
      return {
        type: "qr",
        targetRoute: "/wallet/hub",
        params: { action: "pay", to: id, amount: amount || "", currency: currency || "AED" },
      };
    case "shop":
      return {
        type: "qr",
        targetRoute: `/s/${id}`,
        params: { shop_id: id },
      };
    case "wallet":
      return {
        type: "qr",
        targetRoute: "/wallet/hub",
        params: { action: "receive", from: id },
      };
    default:
      return {
        type: "qr",
        targetRoute: "/explore",
        params: {},
      };
  }
}

// ── Wallet Context ──
export function resolveWalletContext(action: string, meta?: Record<string, string>): ResolvedContext {
  return {
    type: "wallet",
    targetRoute: "/wallet/hub",
    params: { action, ...(meta || {}) },
  };
}

// ── Merchant Context ──
export function resolveMerchantContext(merchantId: string, section?: string): ResolvedContext {
  const sectionMap: Record<string, string> = {
    orders: "/merchant/orders",
    pos: "/merchant/pos",
    payments: "/merchant/payments",
    qr: "/merchant/qr",
  };
  return {
    type: "merchant",
    targetRoute: sectionMap[section || "orders"] || "/merchant/orders",
    params: { merchant_id: merchantId },
  };
}

// ── Ride Context ──
export function resolveRideContext(mode: "ride" | "package", meta?: Record<string, string>): ResolvedContext {
  return {
    type: "ride",
    targetRoute: mode === "package" ? "/mobility/delivery" : "/mobility/taxi",
    params: { mode, ...(meta || {}) },
  };
}

// ── Orbit Context ──
export function resolveOrbitContext(threadId?: string, userId?: string): ResolvedContext {
  if (threadId) {
    return {
      type: "orbit",
      targetRoute: `/orbit/thread/${threadId}`,
      params: { thread_id: threadId },
    };
  }
  if (userId) {
    return {
      type: "orbit",
      targetRoute: `/orbit/new`,
      params: { user_id: userId },
    };
  }
  return { type: "orbit", targetRoute: "/", params: {} };
}

// ── Order / POS Context ──
export function resolveOrderContext(orderId: string, role: "customer" | "merchant"): ResolvedContext {
  return {
    type: "order",
    targetRoute: role === "merchant" ? "/merchant/orders" : `/v1/tracking/${orderId}`,
    params: { order_id: orderId, role },
  };
}
