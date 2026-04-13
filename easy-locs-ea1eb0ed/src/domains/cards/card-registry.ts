/**
 * CARD_REGISTRY — Central manifest of every card in the application.
 * Single source of truth for auditing, routing, and capability checks.
 *
 * Rules:
 * - Every visible card MUST have an entry here
 * - connectionStatus is NEVER set manually — computed by computeConnectionStatus()
 * - No decorative/mock/orphan cards allowed
 * - Every card MUST have an explicit classification
 */
import type { CardRegistryEntry, CardClassification } from "./card-contract";

/** Map of adapter hook names that exist in the codebase — used for auto-detection */
const KNOWN_ADAPTERS = new Set([
  // Home surface
  "useHeroBannerCard",
  "useQuickActionsCard",
  "useCategoryGridCard",
  "useContextBannersCard",
  "useBoostSlotHeroCard",
  "useLiveMapCard",
  "useTrendingSectionCard",
  "useBestRatedSectionCard",
  "useNewestSectionCard",
  "useNearYouSectionCard",
  "useSmartRecommendationsCard",
  "useOnboardingChecklistCard",
  // Driver surface
  "useDriverStatusCard",
  "useDriverPositioningCard",
  "useDriverEarningsCard",
  // Seller surface
  "useSellerBusinessesCard",
  "useSellerListingLifecycleCard",
  // Admin surface
  "useOpsMetricsCard",
  "useSuperMetricsCard",
  // Global
  "useWalletBalanceCard",
  "useOrbitRecentChatsCard",
  "useNotificationsBadgeCard",
]);

export const CARD_REGISTRY: Record<string, CardRegistryEntry> = {
  // ── Home Surface ──
  hero_banner: {
    key: "hero_banner",
    domain: "geo",
    classification: "business_data_card",
    route: "/",
    requiredCapability: "geo.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
  },
  quick_actions: {
    key: "quick_actions",
    domain: "wallet",
    classification: "utility_navigation_card",
    classificationJustification: "Pure navigation shortcuts (Wallet/QR/Send) — no deep business data, no live pipeline",
    route: "/wallet",
    requiredCapability: "wallet.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
  },
  category_grid: {
    key: "category_grid",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
  },
  context_banners: {
    key: "context_banners",
    domain: "geo",
    classification: "business_data_card",
    route: "/radar",
    requiredCapability: "geo.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
  },
  boost_slot_hero: {
    key: "boost_slot_hero",
    domain: "boost",
    classification: "delegated_pipeline_card",
    delegationOwner: "BoostSlotRenderer",
    classificationJustification: "Data pipeline owned by BoostSlotRenderer which fetches active campaigns via boost_campaigns query internally",
    route: "/boost",
    requiredCapability: "boost.read",
    sourceType: "query",
    sourceKey: "boost-slot",
    surface: "home",
  },
  live_map: {
    key: "live_map",
    domain: "geo",
    classification: "business_data_card",
    route: "/mobility/taxi",
    requiredCapability: "geo.read",
    sourceType: "view-model",
    sourceKey: "useDashboardViewModel",
    surface: "home",
  },
  trending_section: {
    key: "trending_section",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
  },
  best_rated_section: {
    key: "best_rated_section",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
  },
  newest_section: {
    key: "newest_section",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
  },
  near_you_section: {
    key: "near_you_section",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "useHomeSections",
    surface: "home",
  },
  smart_recommendations: {
    key: "smart_recommendations",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/radar",
    requiredCapability: "marketplace.read",
    sourceType: "query",
    sourceKey: "smart-home-recommendations",
    surface: "home",
  },
  onboarding_checklist: {
    key: "onboarding_checklist",
    domain: "onboarding",
    classification: "local_only_temporary_card",
    classificationJustification: "Onboarding progress is ephemeral session state — not persisted to DB, dismissed on completion, no cross-surface sync needed",
    route: "/",
    requiredCapability: "onboarding.read",
    sourceType: "query",
    sourceKey: "onboarding-checklist",
    surface: "home",
  },

  // ── Driver Surface ──
  driver_status: {
    key: "driver_status",
    domain: "delivery",
    classification: "business_data_card",
    route: "/driver",
    requiredCapability: "driver.status.write",
    sourceType: "query",
    sourceKey: "useDriverLive",
    surface: "driver",
  },
  driver_positioning: {
    key: "driver_positioning",
    domain: "delivery",
    classification: "on_demand_orchestration_card",
    classificationJustification: "Triggers AI zone suggestion on user tap — not a continuous live stream, result is ephemeral",
    route: "/driver",
    requiredCapability: "driver.read",
    sourceType: "query",
    sourceKey: "driver-positioning",
    surface: "driver",
  },
  driver_earnings: {
    key: "driver_earnings",
    domain: "wallet",
    classification: "business_data_card",
    route: "/driver/earnings",
    requiredCapability: "driver.earnings.read",
    sourceType: "query",
    sourceKey: "driver-earnings",
    surface: "driver",
  },

  // ── Seller Surface ──
  seller_businesses: {
    key: "seller_businesses",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/seller",
    requiredCapability: "seller.read",
    sourceType: "query",
    sourceKey: "seller-services",
    surface: "seller",
  },
  seller_listing_lifecycle: {
    key: "seller_listing_lifecycle",
    domain: "marketplace",
    classification: "business_data_card",
    route: "/seller",
    requiredCapability: "seller.read",
    sourceType: "query",
    sourceKey: "seller-listings",
    surface: "seller",
  },

  // ── Admin Ops Surface ──
  ops_metrics: {
    key: "ops_metrics",
    domain: "analytics",
    classification: "business_data_card",
    route: "/admin/ops",
    requiredCapability: "admin.ops.read",
    sourceType: "query",
    sourceKey: "admin-ops-dashboard",
    surface: "admin-ops",
  },

  // ── Admin Super Surface ──
  super_metrics: {
    key: "super_metrics",
    domain: "analytics",
    classification: "business_data_card",
    route: "/admin/super",
    requiredCapability: "admin.super.read",
    sourceType: "query",
    sourceKey: "super-dashboard",
    surface: "admin-super",
  },

  // ── Global (cross-surface) ──
  wallet_balance: {
    key: "wallet_balance",
    domain: "wallet",
    classification: "business_data_card",
    route: "/wallet",
    requiredCapability: "wallet.read",
    sourceType: "store",
    sourceKey: "useWalletStore",
    surface: "global",
  },
  orbit_recent_chats: {
    key: "orbit_recent_chats",
    domain: "orbit",
    classification: "business_data_card",
    route: "/orbit",
    requiredCapability: "messages.read",
    sourceType: "store",
    sourceKey: "useOrbitStore",
    surface: "global",
  },
  notifications_badge: {
    key: "notifications_badge",
    domain: "notifications",
    classification: "business_data_card",
    route: "/notifications",
    requiredCapability: "notifications.read",
    sourceType: "query",
    sourceKey: "app-notifications",
    surface: "global",
  },
};

/**
 * Compute connectionStatus for a registry entry based on real signals.
 * NEVER hardcode — always derived from adapter existence + source validity.
 */
export function computeConnectionStatus(
  entry: CardRegistryEntry,
  ctx: {
    hasAdapter: boolean;
    hasCardShellUsage: boolean;
    hasRealAction: boolean;
    hasValidRoute: boolean;
    hasDirectFetch: boolean;
    hasMock: boolean;
  },
): CardRegistryEntry["connectionStatus"] {
  if (ctx.hasMock) return "mocked";
  if (ctx.hasDirectFetch) return "broken";
  if (!ctx.hasAdapter) return "orphan";
  if (ctx.hasAdapter && ctx.hasRealAction && ctx.hasValidRoute && !ctx.hasDirectFetch) {
    return ctx.hasCardShellUsage ? "connected" : "partial";
  }
  return "partial";
}

/** Get all registry entries for a surface */
export function getRegistryForSurface(surface: CardRegistryEntry["surface"]): CardRegistryEntry[] {
  return Object.values(CARD_REGISTRY).filter((e) => e.surface === surface);
}

/** Get all registry entries for a domain */
export function getRegistryForDomain(domain: string): CardRegistryEntry[] {
  return Object.values(CARD_REGISTRY).filter((e) => e.domain === domain);
}

/** Check if a card key has a known adapter */
export function hasKnownAdapter(cardKey: string): boolean {
  const adapterName = `use${cardKey
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")}Card`;
  return KNOWN_ADAPTERS.has(adapterName);
}

/** Get cards by classification */
export function getCardsByClassification(classification: CardClassification): CardRegistryEntry[] {
  return Object.values(CARD_REGISTRY).filter((e) => e.classification === classification);
}

/** Audit: find entries with a given connection status */
export function getCardsByConnectionStatus(status: CardRegistryEntry["connectionStatus"]): CardRegistryEntry[] {
  return Object.values(CARD_REGISTRY).filter((e) => e.connectionStatus === status);
}

/** Total count by connection status — for audit reporting */
export function getCardAuditSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const entry of Object.values(CARD_REGISTRY)) {
    const s = entry.connectionStatus || "uncomputed";
    summary[s] = (summary[s] || 0) + 1;
  }
  return summary;
}
