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
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-2 cache listeners (${t.toFixed(0)}ms)`);
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

        const { installRepairConsumers } = await import("@/lib/system/repair-consumers");
        cleanups.push(installRepairConsumers());
      } catch (e) {
        console.warn("[boot] stage-2 failed", e);
      }
    }, 3000);
    timers.push(t2);

    const t3 = setTimeout(async () => {
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-3 core engines (${t.toFixed(0)}ms)`);
      try {
        const [
          { initCoreFlowRegistry },
          { startStaleCacheScanner },
          { startAutoRepairEngine },
          { startRealtimeHealthCheck },
        ] = await Promise.all([
          import("@/lib/runtime/flow-completeness-validator"),
          import("@/lib/runtime/stale-cache-detector"),
          import("@/lib/runtime/auto-repair-engine"),
          import("@/lib/runtime/realtime-intelligence"),
        ]);

        initCoreFlowRegistry();
        cleanups.push(
          startStaleCacheScanner(60_000),
          startAutoRepairEngine(45_000),
          startRealtimeHealthCheck(30_000),
        );

        // Auth-gated: property/real-estate engines only needed for authenticated users
        const { data: { session: s3 } } = await supabase.auth.getSession();
        if (s3) {
          const [{ initPropertyAutomation }, { initRealEstateEngines }] = await Promise.all([
            import("@/lib/engines/property-automation-engine"),
            import("@/lib/engines/real-estate-engine-registry"),
          ]);
          initPropertyAutomation();
          initRealEstateEngines();
        }
      } catch (e) {
        console.warn("[boot] stage-3 failed", e);
      }
    }, 5000);
    timers.push(t3);

    const t4 = setTimeout(async () => { // Reduced from 8000ms to 6000ms for faster engine boot
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-4 engine system (${t.toFixed(0)}ms)`);
      // Engine system (data quality on public entities) runs for all users
      try {
        const { bootEngineSystem } = await import("@/engines/engine-registry");
        const cleanup = bootEngineSystem();
        if (cleanup) cleanups.push(cleanup);
      } catch (e) {
        console.warn("[boot] stage-4 failed", e);
      }

      // Auth-gated: engine memory, learning cycle, command center only for authenticated users
      const { data: { session: s4 } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!s4) {
        console.log("[boot] stage-4 auth-gated ops skipped — no authenticated user");
        return;
      }

      try {
        const { engineMemory } = await import("@/engines/core/engine-memory");
        await engineMemory.loadFromSupabase();

        const { startLearningCycle } = await import("@/engines/core/engine-learning");
        cleanups.push(startLearningCycle());
      } catch (e) {
        console.warn("[boot] engine-memory failed", e);
      }

      try {
        const { bootCommandCenter } = await import("@/core/command-center");
        bootCommandCenter();
      } catch (e) {
        console.warn("[boot] command-center failed", e);
      }
    }, 6000);
    timers.push(t4);

    let idleCbId: number | undefined;
    const scheduleLateBoot = () => {
      if (document.hidden) {
        const onVisible = () => { document.removeEventListener("visibilitychange", onVisible); scheduleLateBoot(); };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      idleCbId = requestIdleCallback(async () => {
        try {
          const { runPlatformRecovery } = await import("@/lib/platform/platform-recovery-engine");
          void runPlatformRecovery("boot");
        } catch (e) {
          console.warn("[boot] recovery failed", e);
        }

        if (document.hidden) return;

        try {
          const { godCore } = await import("@/lib/god/god-core");
          godCore.boot();
        } catch (e) {
          console.warn("[boot] god-system failed", e);
        }

        try {
          const { sentinelCore } = await import("@/core/sentinel");
          await sentinelCore.boot();
          cleanups.push(() => sentinelCore.shutdown());
        } catch (e) {
          console.warn("[boot] sentinel-core failed", e);
        }

        try {
          const { omegaCore } = await import("@/core/omega");
          await omegaCore.boot();
          cleanups.push(() => { omegaCore.shutdown(); });
        } catch (e) {
          console.warn("[boot] omega-core failed", e);
        }
      }, { timeout: 30_000 });
    };
    const t5 = setTimeout(scheduleLateBoot, 15_000);
    timers.push(t5);

    return () => {
      timers.forEach(clearTimeout);
      if (idleCbId !== undefined) cancelIdleCallback(idleCbId);
      cleanups.forEach((fn) => fn());
      booted = false;
    };
  }, [queryClient]);
}
