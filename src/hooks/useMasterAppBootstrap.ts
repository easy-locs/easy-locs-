import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";
import { installPlatformReactions } from "@/lib/shared/platform-bus";
import { installStorefrontReactions } from "@/lib/shared/storefront-reactions";
import { installCrossAppReactions } from "@/lib/shared/cross-app-reactions";
import { runPlatformRecovery } from "@/lib/platform/platform-recovery-engine";
import { installSmartFlowBridge } from "@/lib/runtime/smart-flow-bridge";
import { installOrbitCacheListener, registerQueryClient } from "@/lib/orbit/orbit-cache-invalidator";
import { installDeadEventConsumers } from "@/lib/shared/dead-event-consumers";
import { installWalletCacheListener, registerWalletQueryClient } from "@/lib/wallet/wallet-cache-invalidator";
import { installDashboardCacheListener, registerDashboardQueryClient } from "@/lib/dashboard/dashboard-cache-invalidator";
import { installDeliveryCacheListener, registerDeliveryQueryClient } from "@/lib/delivery/delivery-cache-invalidator";
import { installCounterBridge } from "@/lib/dashboard/dashboard-counter-bridge";
import { installNotificationEventBridge } from "@/lib/notifications/notification-event-bridge";
import { startStaleCacheScanner } from "@/lib/runtime/stale-cache-detector";
import { useQueryClient } from "@tanstack/react-query";

let booted = false;

export function useMasterAppBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (booted) return;
    booted = true;

    // 0. Register queryClient for all domain cache invalidators
    registerQueryClient(queryClient);
    registerWalletQueryClient(queryClient);
    registerDashboardQueryClient(queryClient);
    registerDeliveryQueryClient(queryClient);

    // 1. Platform event bus reactions (wallet ↔ orbit ↔ marketplace)
    const cleanupBus = installPlatformReactions();
    const cleanupStorefront = installStorefrontReactions();

    // 2. Cross-app integration (Wallet→Orbit, Booking→Orbit, Radar→Orbit, etc.)
    const cleanupCrossApp = installCrossAppReactions();

    // 3. Orchestration engine (order lifecycle events)
    installOrchestrationEngine();

    // 4. Engine connector hub (driver matching, escrow, state machine)
    installEngineConnectorHub();

    // 5. Smart flow bridge — runtime supervision
    const cleanupFlowBridge = installSmartFlowBridge();

    // 6. Domain cache auto-invalidation on events
    const cleanupOrbitCache = installOrbitCacheListener();
    const cleanupWalletCache = installWalletCacheListener();
    const cleanupDashboardCache = installDashboardCacheListener();
    const cleanupDeliveryCache = installDeliveryCacheListener();

    // 7. Dead event consumers — wire previously orphaned events
    const cleanupDeadEvents = installDeadEventConsumers();

    // 8. Counter bridge — badge/counter refresh from events
    const cleanupCounters = installCounterBridge();

    // 9. Notification event bridge — auto-create notifications from domain events
    const cleanupNotifications = installNotificationEventBridge();

    // 10. Runtime: stale cache scanner
    const cleanupStaleScanner = startStaleCacheScanner(60_000);

    // 11. Platform recovery — deferred well after initial render
    const t1 = setTimeout(() => void runPlatformRecovery("boot"), 30000);

    return () => {
      clearTimeout(t1);
      cleanupBus();
      cleanupStorefront();
      cleanupCrossApp();
      cleanupFlowBridge();
      cleanupOrbitCache();
      cleanupWalletCache();
      cleanupDashboardCache();
      cleanupDeliveryCache();
      cleanupDeadEvents();
      cleanupCounters();
      cleanupNotifications();
      cleanupStaleScanner();
      booted = false;
    };
  }, [queryClient]);
}
