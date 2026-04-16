import { queryClient, setupQueryPersistence, hydrateFromCache } from "@/lib/query-client";
import { setActionQueryClient } from "@/lib/run-action";

export const safeIdleCallback = (fn: () => void, opts?: { timeout: number }) => {
  if (typeof requestIdleCallback === "function") {
    return requestIdleCallback(fn, opts);
  }
  return setTimeout(fn, opts?.timeout ?? 100) as unknown as number;
};

export { queryClient };

let booted = false;
export function bootstrapAppRuntime() {
  if (booted) return;
  booted = true;

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__REACT_QUERY_CLIENT__ = queryClient;
  }
  setActionQueryClient(queryClient);
  setupQueryPersistence();
  hydrateFromCache().catch(() => {});

  safeIdleCallback(() => {
    import("@/lib/web-vitals").then(m => m.initWebVitals()).catch(() => {});
  }, { timeout: 2000 });

  safeIdleCallback(() => {
    import("@/lib/quality-gates").then(m => m.initQualityGates()).catch(() => {});
  }, { timeout: 3000 });

  safeIdleCallback(() => {
    import("@/lib/smart-prefetch").then((m) => {
      m.prefetchCriticalRoutes();
      m.initPreconnectHints();
    }).catch(() => {});
  }, { timeout: 5000 });

  safeIdleCallback(() => {
    import("@/lib/cross-tab-sync").then((m) => {
      m.crossTabSync.init();
      import("@/lib/cross-tab-subscribers").then((s) => s.installCrossTabSubscribers()).catch(() => {});
    }).catch(() => {});
  }, { timeout: 3000 });

  safeIdleCallback(() => {
    import("@/lib/analytics/event-bus").then((m) => {
      if (typeof Worker !== "undefined") m.startWorkerBatching();
    }).catch(() => {});
  }, { timeout: 8000 });

  safeIdleCallback(() => {
    import("@/lib/super-app-bridge").then((m) => m.installSuperAppBridge()).catch(() => {});
  }, { timeout: 10000 });

  safeIdleCallback(() => {
    import("@/lib/analytics/segment").then((m) => m.initSegment()).catch(() => {});
  }, { timeout: 3000 });

  safeIdleCallback(() => {
    import("@/workers/cross-tab-client").then(({ crossTabClient }) => {
      crossTabClient.connect();
    }).catch(() => {});
  }, { timeout: 4000 });

  safeIdleCallback(() => {
    import("@/lib/performance/prefetch-engine").then(({ prefetchEngine }) => {
      prefetchEngine.registerRouteModule("/dashboard", () => import("@/pages/Dashboard"));
      prefetchEngine.registerRouteModule("/explore", () => import("@/pages/ExplorePage"));
      prefetchEngine.registerRouteModule("/orbit", () => import("@/pages/CommunicationCenter"));
      prefetchEngine.registerRouteModule("/wallet", () => import("@/pages/WalletHubPage"));
      prefetchEngine.registerRouteModule("/me", () => import("@/pages/MeCommandCenter"));
      prefetchEngine.registerRouteModule("/food", () => import("@/pages/food/FoodTypePage"));
      prefetchEngine.registerRouteModule("/taxi", () => import("@/pages/mobility/MobilityTaxiPage"));
      prefetchEngine.registerRouteModule("/stay", () => import("@/pages/travel/TravelStayHub"));
      prefetchEngine.registerRouteModule("/services", () => import("@/pages/LocalServices"));
      prefetchEngine.registerRouteModule("/home", () => import("@/pages/Index"));
    }).catch(() => {});
  }, { timeout: 6000 });
}
