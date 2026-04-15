const prefetchedRoutes = new Set<string>();
let prefetchScheduled = false;

const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  "/": ["/radar", "/orbit", "/wallet", "/me", "/browse"],
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
  "/orbit/contacts": () => import("@/pages/OrbitContactsPage"),
  "/browse": () => import("@/pages/universe/DiscoverPage"),
  "/explore": () => import("@/pages/ExplorePage"),
  "/favorites": () => import("@/pages/FavoritesPage"),
  "/dashboard/tenants": () => import("@/pages/Tenants"),
  "/dashboard/finances": () => import("@/pages/Finances"),
  "/merchant/orders": () => import("@/pages/MerchantOrdersPage"),
  "/merchant/menu": () => import("@/pages/merchant/MerchantMenuPage"),
  "/login": () => import("@/pages/Login"),
  "/signup": () => import("@/pages/Signup"),
};

const scheduleIdle = (fn: () => void, opts?: { timeout: number }) => {
  if (typeof requestIdleCallback === "function") return requestIdleCallback(fn, opts);
  return setTimeout(fn, opts?.timeout ?? 100) as unknown as number;
};

function prefetchRoute(route: string) {
  if (prefetchedRoutes.has(route)) return;
  const loader = ROUTE_LAZY_MAP[route];
  if (loader) {
    prefetchedRoutes.add(route);
    loader().catch(() => {});
  }
}

export function prefetchForRoute(currentPath: string) {
  const normalized = currentPath.split("?")[0];
  const targets = ROUTE_PREFETCH_MAP[normalized];
  if (!targets) return;

  scheduleIdle(() => {
    for (const target of targets) {
      prefetchRoute(target);
    }
  }, { timeout: 500 });
}

export function prefetchOnInteraction(targetRoute: string) {
  prefetchRoute(targetRoute);
}

export function prefetchOnHover(targetRoute: string) {
  if (prefetchedRoutes.has(targetRoute)) return;
  const loader = ROUTE_LAZY_MAP[targetRoute];
  if (loader) {
    prefetchedRoutes.add(targetRoute);
    loader().catch(() => {});
  }
}

export function createPrefetchHandlers(targetRoute: string) {
  let prefetched = false;
  const doPrefetch = () => {
    if (prefetched) return;
    prefetched = true;
    prefetchOnHover(targetRoute);
  };
  return {
    onMouseEnter: doPrefetch,
    onFocus: doPrefetch,
    onTouchStart: doPrefetch,
  };
}

export function prefetchCriticalRoutes() {
  if (prefetchScheduled) return;
  prefetchScheduled = true;

  scheduleIdle(() => {
    const critical = ["/radar", "/orbit", "/wallet", "/me"];
    for (const route of critical) {
      prefetchRoute(route);
    }
  }, { timeout: 1000 });
}

export function prefetchAllPillars() {
  const pillars = ["/radar", "/orbit", "/wallet", "/me", "/login", "/signup"];
  for (const route of pillars) {
    prefetchRoute(route);
  }
}

export function addPreconnectHint(url: string) {
  if (typeof document === "undefined") return;
  const existing = document.querySelector(`link[rel="preconnect"][href="${url}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

export function initPreconnectHints() {
  addPreconnectHint("https://ifvuvbolrmuuugtzxsfk.supabase.co");
  addPreconnectHint("https://api.mapbox.com");
  addPreconnectHint("https://tiles.mapbox.com");
}
