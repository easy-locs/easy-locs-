/**
 * CARD_REGISTRY — Central manifest of every card in the application.
 * Single source of truth for auditing, routing, and capability checks.
 *
 * Rules:
 * - Every visible card MUST have an entry here
 * - Every entry MUST have a real route, a real domain, a real source
 * - No decorative/mock/orphan cards allowed
 */
import type { CardRegistryEntry } from "./card-contract";

export const CARD_REGISTRY: Record<string, CardRegistryEntry> = {
  // ── Home Surface ──
  hero_banner: {
    key: "hero_banner",
    domain: "geo",
    route: "/",
    requiredCapability: "geo.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
    connectionStatus: "connected",
  },
  quick_actions: {
    key: "quick_actions",
    domain: "wallet",
    route: "/wallet/hub",
    requiredCapability: "wallet.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
    connectionStatus: "connected",
  },
  category_grid: {
    key: "category_grid",
    domain: "marketplace",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
    connectionStatus: "connected",
  },
  context_banners: {
    key: "context_banners",
    domain: "geo",
    route: "/radar",
    requiredCapability: "geo.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
    connectionStatus: "connected",
  },
  boost_slot_hero: {
    key: "boost_slot_hero",
    domain: "boost",
    route: "/boost",
    requiredCapability: "boost.read",
    sourceType: "query",
    sourceKey: "boost-slot",
    surface: "home",
    connectionStatus: "connected",
  },
  live_map: {
    key: "live_map",
    domain: "geo",
    route: "/mobility/taxi",
    requiredCapability: "geo.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
    connectionStatus: "connected",
  },
  trending_section: {
    key: "trending_section",
    domain: "marketplace",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
    connectionStatus: "connected",
  },
  best_rated_section: {
    key: "best_rated_section",
    domain: "marketplace",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
    connectionStatus: "connected",
  },
  newest_section: {
    key: "newest_section",
    domain: "marketplace",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
    connectionStatus: "connected",
  },
  near_you_section: {
    key: "near_you_section",
    domain: "marketplace",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
    connectionStatus: "connected",
  },
  onboarding_checklist: {
    key: "onboarding_checklist",
    domain: "onboarding",
    route: "/",
    requiredCapability: "onboarding.read",
    sourceType: "query",
    sourceKey: "onboarding-checklist",
    surface: "home",
    connectionStatus: "connected",
  },

  // ── Admin Ops Surface ──
  ops_metrics: {
    key: "ops_metrics",
    domain: "analytics",
    route: "/admin/ops",
    requiredCapability: "admin.ops.read",
    sourceType: "query",
    sourceKey: "admin-ops-dashboard",
    surface: "admin-ops",
    connectionStatus: "connected",
  },

  // ── Admin Super Surface ──
  super_metrics: {
    key: "super_metrics",
    domain: "analytics",
    route: "/admin/super",
    requiredCapability: "admin.super.read",
    sourceType: "query",
    sourceKey: "super-dashboard",
    surface: "admin-super",
    connectionStatus: "connected",
  },
  super_nav_links: {
    key: "super_nav_links",
    domain: "analytics",
    route: "/admin/super",
    requiredCapability: "admin.super.read",
    sourceType: "static",
    sourceKey: "static",
    surface: "admin-super",
    connectionStatus: "connected",
  },

  // ── Driver Surface ──
  driver_status: {
    key: "driver_status",
    domain: "delivery",
    route: "/driver",
    requiredCapability: "driver.status.write",
    sourceType: "query",
    sourceKey: "driver-live",
    surface: "driver",
    connectionStatus: "connected",
  },
  driver_actions: {
    key: "driver_actions",
    domain: "delivery",
    route: "/driver",
    requiredCapability: "driver.read",
    sourceType: "static",
    sourceKey: "static",
    surface: "driver",
    connectionStatus: "connected",
  },
  driver_earnings: {
    key: "driver_earnings",
    domain: "wallet",
    route: "/driver/earnings",
    requiredCapability: "driver.earnings.read",
    sourceType: "query",
    sourceKey: "driver-earnings",
    surface: "driver",
    connectionStatus: "connected",
  },

  // ── Seller Surface ──
  seller_businesses: {
    key: "seller_businesses",
    domain: "marketplace",
    route: "/seller",
    requiredCapability: "seller.read",
    sourceType: "query",
    sourceKey: "seller-services",
    surface: "seller",
    connectionStatus: "connected",
  },

  // ── Global (cross-surface) ──
  wallet_balance: {
    key: "wallet_balance",
    domain: "wallet",
    route: "/wallet/hub",
    requiredCapability: "wallet.read",
    sourceType: "store",
    sourceKey: "useWalletStore",
    surface: "global",
    connectionStatus: "connected",
  },
  orbit_recent_chats: {
    key: "orbit_recent_chats",
    domain: "orbit",
    route: "/orbit",
    requiredCapability: "messages.read",
    sourceType: "store",
    sourceKey: "useOrbitStore",
    surface: "global",
    connectionStatus: "connected",
  },
  notifications_badge: {
    key: "notifications_badge",
    domain: "notifications",
    route: "/notifications",
    requiredCapability: "notifications.read",
    sourceType: "query",
    sourceKey: "app-notifications",
    surface: "global",
    connectionStatus: "connected",
  },
};

/** Get all registry entries for a surface */
export function getRegistryForSurface(surface: CardRegistryEntry["surface"]): CardRegistryEntry[] {
  return Object.values(CARD_REGISTRY).filter((e) => e.surface === surface);
}

/** Get all registry entries for a domain */
export function getRegistryForDomain(domain: string): CardRegistryEntry[] {
  return Object.values(CARD_REGISTRY).filter((e) => e.domain === domain);
}

/** Audit: find entries with a given connection status */
export function getCardsByConnectionStatus(status: CardRegistryEntry["connectionStatus"]): CardRegistryEntry[] {
  return Object.values(CARD_REGISTRY).filter((e) => e.connectionStatus === status);
}

/** Total count by connection status — for audit reporting */
export function getCardAuditSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const entry of Object.values(CARD_REGISTRY)) {
    const s = entry.connectionStatus || "unknown";
    summary[s] = (summary[s] || 0) + 1;
  }
  return summary;
}
