/**
 * INTENT ENGINE — Captures and resolves user intent.
 * ===================================================
 * Maps user actions to system capabilities.
 * Layer: System Capabilities (NOT business taxonomy, NOT action model).
 *
 * Intent = what the system understands the user wants to do.
 * Action = the UI gesture (scan, tap, search) — stays in action layer.
 * Resolution = which capability handles it (wallet, QR, booking, etc.)
 */

// ═══════════════════════════════════════════════════════════
//  INTENT TYPES
// ═══════════════════════════════════════════════════════════

export type IntentCategory =
  | "discovery"    // find a business/offer
  | "transaction"  // pay, transfer, top-up
  | "communication" // call, chat
  | "navigation"   // go to entity/page
  | "booking"      // reserve, schedule
  | "order"        // place an order
  | "subscription" // subscribe to pass/plan
  | "identity"     // verify, authenticate
  | "share";       // share entity/offer

export interface UserIntent {
  id: string;
  category: IntentCategory;
  /** The entity this intent targets */
  entityId?: string | null;
  /** Specific action hint */
  action?: string;
  /** Taxonomy context */
  vertical?: string;
  subcategory?: string;
  /** Geo context */
  city?: string;
  countryCode?: string;
  /** Amount for transactions */
  amount?: number;
  currency?: string;
  /** Source of intent */
  source: IntentSource;
  /** Timestamp */
  createdAt: string;
  /** Resolution status */
  status: "pending" | "resolved" | "failed" | "expired";
  /** Resolved route or handler */
  resolvedRoute?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export type IntentSource =
  | "qr_scan"
  | "deep_link"
  | "search"
  | "map_tap"
  | "radar_tap"
  | "notification"
  | "share_link"
  | "direct";

// ═══════════════════════════════════════════════════════════
//  INTENT RESOLUTION
// ═══════════════════════════════════════════════════════════

export interface IntentResolver {
  category: IntentCategory;
  resolve(intent: UserIntent): IntentResolution;
}

export interface IntentResolution {
  route: string;
  capability: string;
  params?: Record<string, string>;
  requiresAuth?: boolean;
}

const resolvers = new Map<IntentCategory, IntentResolver>();

export function registerResolver(resolver: IntentResolver): void {
  resolvers.set(resolver.category, resolver);
}

/**
 * Resolve an intent to a route + capability.
 * Falls back to discovery if no resolver matches.
 */
export function resolveIntent(intent: UserIntent): IntentResolution {
  const resolver = resolvers.get(intent.category);
  if (resolver) return resolver.resolve(intent);

  // Default fallback: navigate to entity or discovery
  if (intent.entityId) {
    return { route: `/entity/${intent.entityId}`, capability: "navigation" };
  }
  return { route: "/browse", capability: "discovery" };
}

// ═══════════════════════════════════════════════════════════
//  DEFAULT RESOLVERS
// ═══════════════════════════════════════════════════════════

registerResolver({
  category: "transaction",
  resolve: (intent) => ({
    route: intent.entityId ? `/pay/${intent.entityId}` : "/wallet",
    capability: "wallet",
    requiresAuth: true,
  }),
});

registerResolver({
  category: "discovery",
  resolve: (intent) => ({
    route: intent.subcategory
      ? `/browse?vertical=${intent.vertical}&sub=${intent.subcategory}`
      : intent.vertical
        ? `/${intent.vertical}`
        : "/browse",
    capability: "radar",
  }),
});

registerResolver({
  category: "navigation",
  resolve: (intent) => ({
    route: intent.entityId ? `/s/${intent.entityId}` : "/browse",
    capability: "navigation",
  }),
});

registerResolver({
  category: "communication",
  resolve: (intent) => ({
    route: intent.entityId ? `/orbit/chat/${intent.entityId}` : "/orbit",
    capability: "orbit",
    requiresAuth: true,
  }),
});

registerResolver({
  category: "booking",
  resolve: (intent) => ({
    route: intent.entityId ? `/book/${intent.entityId}` : "/browse",
    capability: "booking",
    requiresAuth: true,
  }),
});

registerResolver({
  category: "order",
  resolve: (intent) => ({
    route: intent.entityId ? `/order/${intent.entityId}` : "/browse",
    capability: "orders",
    requiresAuth: true,
  }),
});

registerResolver({
  category: "subscription",
  resolve: (intent) => ({
    route: intent.entityId ? `/subscribe/${intent.entityId}` : "/passes",
    capability: "subscription",
    requiresAuth: true,
  }),
});
