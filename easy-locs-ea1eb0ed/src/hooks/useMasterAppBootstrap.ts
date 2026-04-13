import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

let booted = false;


export function useMasterAppBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (booted) return;
    booted = true;
    const bootStart = performance.now();
    console.log("[boot] master-bootstrap started");

    let hookDisposed = false;
    const cleanups: Array<() => void> = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    const t0 = setTimeout(async () => {
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-0 orchestration (${t.toFixed(0)}ms)`);
      try {
        const [
          { installOrchestrationEngine },
          { installSmartFlowBridge },
          { installOrbitCacheListener, registerQueryClient },
          { registerWalletQueryClient },
          { registerDashboardQueryClient },
          { registerDeliveryQueryClient },
          { registerOrderQueryClient },
          { registerStorefrontQueryClient },
          { registerSupportQueryClient },
        ] = await Promise.all([
          import("@/lib/orchestration/orchestrator"),
          import("@/lib/runtime/smart-flow-bridge"),
          import("@/lib/orbit/orbit-cache-invalidator"),
          import("@/lib/wallet/wallet-cache-invalidator"),
          import("@/lib/dashboard/dashboard-cache-invalidator"),
          import("@/lib/delivery/delivery-cache-invalidator"),
          import("@/lib/orders/order-cache-invalidator"),
          import("@/lib/storefront/storefront-cache-invalidator"),
          import("@/lib/support/support-cache-invalidator"),
        ]);

        if (hookDisposed) return;

        registerQueryClient(queryClient);
        registerWalletQueryClient(queryClient);
        registerDashboardQueryClient(queryClient);
        registerDeliveryQueryClient(queryClient);
        registerOrderQueryClient(queryClient);
        registerStorefrontQueryClient(queryClient);
        registerSupportQueryClient(queryClient);

        installOrchestrationEngine();
        cleanups.push(installSmartFlowBridge());
        cleanups.push(installOrbitCacheListener());
      } catch (e) {
        console.warn("[boot] stage-0 failed", e);
      }
    }, 50);
    timers.push(t0);

    const t1 = setTimeout(async () => {
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-1 platform reactions (${t.toFixed(0)}ms)`);
      try {
        const [
          { installPlatformReactions },
          { installStorefrontReactions },
          { installCrossAppReactions },
          { installEngineConnectorHub },
          { installNotificationEventBridge },
          { installCounterBridge },
          { installDeliveryBridge },
          { installWalletCacheListener },
          { installDashboardCacheListener },
          { installDeliveryCacheListener },
          { installOrderCacheListener },
          { installStorefrontCacheListener },
          { installSupportCacheListener },
          { installRentalCacheListeners },
          { installSeasonalCacheListeners },
          { installDealCacheListeners },
          { installConciergeCacheListeners },
          { installGroupCacheListeners },
          { installRadarCacheListeners },
          { installCrossDomainPropagationHandlers },
        ] = await Promise.all([
          import("@/lib/shared/platform-bus"),
          import("@/lib/shared/storefront-reactions"),
          import("@/lib/shared/cross-app-reactions"),
          import("@/lib/system/engineConnectorHub"),
          import("@/lib/notifications/notification-event-bridge"),
          import("@/lib/dashboard/dashboard-counter-bridge"),
          import("@/lib/shared/v4-delivery-bridge"),
          import("@/lib/wallet/wallet-cache-invalidator"),
          import("@/lib/dashboard/dashboard-cache-invalidator"),
          import("@/lib/delivery/delivery-cache-invalidator"),
          import("@/lib/orders/order-cache-invalidator"),
          import("@/lib/storefront/storefront-cache-invalidator"),
          import("@/lib/support/support-cache-invalidator"),
          import("@/lib/rental/rental-cache-invalidator"),
          import("@/lib/seasonal/seasonal-cache-invalidator"),
          import("@/lib/deals/deals-cache-invalidator"),
          import("@/lib/concierge/concierge-cache-invalidator"),
          import("@/lib/groups/groups-cache-invalidator"),
          import("@/lib/radar/radar-cache-invalidator"),
          import("@/lib/orchestration/handlers/cross-domain-propagation-handlers"),
        ]);

        if (hookDisposed) return;

        installEngineConnectorHub();
        cleanups.push(
          installPlatformReactions(),
          installStorefrontReactions(),
          installCrossAppReactions(),
          installNotificationEventBridge(),
          installCounterBridge(),
          installDeliveryBridge(),
          installWalletCacheListener(),
          installDashboardCacheListener(),
          installDeliveryCacheListener(),
          installOrderCacheListener(),
          installStorefrontCacheListener(),
          installSupportCacheListener(),
          installRentalCacheListeners(),
          installSeasonalCacheListeners(),
          installDealCacheListeners(),
          installConciergeCacheListeners(),
          installGroupCacheListeners(),
          installRadarCacheListeners(),
          installCrossDomainPropagationHandlers(),
        );

        const { installRepairConsumers } = await import("@/lib/system/repair-consumers");
        cleanups.push(installRepairConsumers());
      } catch (e) {
        console.warn("[boot] stage-1 (bridges) failed", e);
      }
    }, 200);
    timers.push(t1);

    const t2 = setTimeout(async () => {
      if (hookDisposed) return;
      try {
        const { engineMemory } = await import("@/engines/core/engine-memory");
        if (hookDisposed) return;
        await engineMemory.loadFromSupabase();
        if (hookDisposed) return;

        const { startLearningCycle } = await import("@/engines/core/engine-learning");
        if (!hookDisposed) cleanups.push(startLearningCycle());
      } catch (e) {
        console.warn("[boot] engine-memory failed", e);
      }

      if (hookDisposed) return;
      try {
        const { bootCommandCenter } = await import("@/core/command-center");
        if (!hookDisposed) bootCommandCenter();
      } catch (e) {
        console.warn("[boot] command-center failed", e);
      }

      if (hookDisposed) return;
      try {
        const { bootEngineSystem } = await import("@/engines/engine-registry");
        if (hookDisposed) return;
        const cleanup = bootEngineSystem();
        if (!hookDisposed && cleanup) cleanups.push(cleanup);
      } catch (e) {
        console.warn("[boot] engine-system failed", e);
      }
    }, 600);
    timers.push(t2);

    return () => {
      hookDisposed = true;
      timers.forEach(clearTimeout);
      cleanups.forEach((fn) => fn());
      booted = false;
    };
  }, [queryClient]);
}
