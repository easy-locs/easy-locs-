import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

let booted = false;

export function useMasterAppBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (booted) return;
    booted = true;

    const cleanups: Array<() => void> = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    const t0 = setTimeout(async () => {
      try {
        const [
          { installOrchestrationEngine },
          { installSmartFlowBridge },
          { installOrbitCacheListener, registerQueryClient },
          { installDeadEventConsumers },
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
          import("@/lib/shared/dead-event-consumers"),
          import("@/lib/wallet/wallet-cache-invalidator"),
          import("@/lib/dashboard/dashboard-cache-invalidator"),
          import("@/lib/delivery/delivery-cache-invalidator"),
          import("@/lib/orders/order-cache-invalidator"),
          import("@/lib/storefront/storefront-cache-invalidator"),
          import("@/lib/support/support-cache-invalidator"),
        ]);

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
        cleanups.push(installDeadEventConsumers());
      } catch (e) {
        console.warn("[boot] stage-0 failed", e);
      }
    }, 50);
    timers.push(t0);

    const t1 = setTimeout(async () => {
      try {
        const [
          { installPlatformReactions },
          { installStorefrontReactions },
          { installCrossAppReactions },
          { installEngineConnectorHub },
          { installNotificationEventBridge },
          { installCounterBridge },
          { installDeliveryBridge },
        ] = await Promise.all([
          import("@/lib/shared/platform-bus"),
          import("@/lib/shared/storefront-reactions"),
          import("@/lib/shared/cross-app-reactions"),
          import("@/lib/system/engineConnectorHub"),
          import("@/lib/notifications/notification-event-bridge"),
          import("@/lib/dashboard/dashboard-counter-bridge"),
          import("@/lib/shared/v4-delivery-bridge"),
        ]);

        installEngineConnectorHub();
        cleanups.push(
          installPlatformReactions(),
          installStorefrontReactions(),
          installCrossAppReactions(),
          installNotificationEventBridge(),
          installCounterBridge(),
          installDeliveryBridge(),
        );
      } catch (e) {
        console.warn("[boot] stage-1 failed", e);
      }
    }, 1500);
    timers.push(t1);

    const t2 = setTimeout(async () => {
      try {
        const [
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

        cleanups.push(
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
      } catch (e) {
        console.warn("[boot] stage-2 failed", e);
      }
    }, 3000);
    timers.push(t2);

    const t3 = setTimeout(async () => {
      try {
        const [
          { initCoreFlowRegistry },
          { startStaleCacheScanner },
          { startAutoRepairEngine },
          { startRealtimeHealthCheck },
          { initPropertyAutomation },
        ] = await Promise.all([
          import("@/lib/runtime/flow-completeness-validator"),
          import("@/lib/runtime/stale-cache-detector"),
          import("@/lib/runtime/auto-repair-engine"),
          import("@/lib/runtime/realtime-intelligence"),
          import("@/lib/engines/property-automation-engine"),
        ]);

        initCoreFlowRegistry();
        initPropertyAutomation();
        cleanups.push(
          startStaleCacheScanner(60_000),
          startAutoRepairEngine(45_000),
          startRealtimeHealthCheck(30_000),
        );
      } catch (e) {
        console.warn("[boot] stage-3 failed", e);
      }
    }, 5000);
    timers.push(t3);

    const t4 = setTimeout(async () => {
      try {
        const { bootEngineSystem } = await import("@/engines/engine-registry");
        const cleanup = bootEngineSystem();
        if (cleanup) cleanups.push(cleanup);
      } catch (e) {
        console.warn("[boot] stage-4 failed", e);
      }
    }, 8000);
    timers.push(t4);

    const t5 = setTimeout(async () => {
      try {
        const { runPlatformRecovery } = await import("@/lib/platform/platform-recovery-engine");
        void runPlatformRecovery("boot");
      } catch (e) {
        console.warn("[boot] recovery failed", e);
      }
    }, 15000);
    timers.push(t5);

    return () => {
      timers.forEach(clearTimeout);
      cleanups.forEach((fn) => fn());
      booted = false;
    };
  }, [queryClient]);
}
