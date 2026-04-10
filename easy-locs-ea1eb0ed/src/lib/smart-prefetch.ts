const prefetchedRoutes = new Set<string>();

const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  "/": ["/radar", "/orbit", "/wallet", "/me"],
  "/radar": ["/mobility/taxi", "/browse", "/explore"],
  "/orbit": ["/orbit/contacts"],
  "/wallet": ["/wallet/transfer", "/pay/scan", "/wallet/top-up"],
  "/me": ["/settings/account", "/settings/security", "/favorites"],
  "/browse": [],
  "/dashboard": ["/dashboard/tenants", "/dashboard/finances"],
  "/merchant/dashboard": ["/merchant/orders", "/merchant/menu"],
};

const ROUTE_LAZY_MAP: Record<string, () => Promise<unknown>> = {
  "/radar": () => import("@/pages/HyperRadarPage"),
  "/orbit": () => import("@/pages/CommunicationCenter"),
  "/wallet": () => import("@/pages/WalletHubPage"),
  "/me": () => import("@/pages/MeCommandCenter"),
  "/wallet/transfer": () => import("@/pages/wallet/WalletTransferPage"),
  "/pay/scan": () => import("@/pages/payments/QrScannerPage"),
  "/wallet/top-up": () => import("@/pages/wallet/WalletTopUpPage"),
  "/settings/account": () => import("@/pages/settings/SettingsAccount"),
  "/settings/security": () => import("@/pages/settings/SettingsSecurity"),
  "/mobility/taxi": () => import("@/pages/mobility/MobilityTaxiPage"),
  "/orbit/contacts": () => import("@/pages/OrbitContactsPageV2"),
  "/browse": () => import("@/pages/universe/DiscoverPage"),
  "/explore": () => import("@/pages/ExplorePage"),
  "/favorites": () => import("@/pages/FavoritesPage"),
  "/dashboard/tenants": () => import("@/pages/Tenants"),
  "/dashboard/finances": () => import("@/pages/Finances"),
  "/merchant/orders": () => import("@/pages/MerchantOrdersPage"),
  "/merchant/menu": () => import("@/pages/merchant/MerchantMenuPage"),
};

const scheduleIdle = typeof requestIdleCallback === "function"
  ? (fn: () => void, opts?: { timeout: number }) => requestIdleCallback(fn, opts)
  : (fn: () => void, opts?: { timeout: number }) => setTimeout(fn, opts?.timeout ?? 2000);

export function prefetchForRoute(currentPath: string) {
  const normalized = currentPath.split("?")[0];
  const targets = ROUTE_PREFETCH_MAP[normalized];
  if (!targets) return;

  scheduleIdle(() => {
    for (const target of targets) {
      if (prefetchedRoutes.has(target)) continue;
      const loader = ROUTE_LAZY_MAP[target];
      if (loader) {
        prefetchedRoutes.add(target);
        loader().catch(() => {});
      }
    }
  }, { timeout: 2000 });
}

export function prefetchCriticalRoutes() {
  scheduleIdle(() => {
    const critical = ["/radar", "/orbit", "/wallet", "/me"];
    for (const route of critical) {
      if (prefetchedRoutes.has(route)) continue;
      const loader = ROUTE_LAZY_MAP[route];
      if (loader) {
        prefetchedRoutes.add(route);
        loader().catch(() => {});
      }
    }
  }, { timeout: 3000 });
}
