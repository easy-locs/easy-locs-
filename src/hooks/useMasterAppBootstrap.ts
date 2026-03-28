import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";
import { installPlatformReactions } from "@/lib/shared/platform-bus";
import { installStorefrontReactions } from "@/lib/shared/storefront-reactions";
import { installCrossAppReactions } from "@/lib/shared/cross-app-reactions";
import { runPlatformRecovery } from "@/lib/platform/platform-recovery-engine";
import { installSmartFlowBridge } from "@/lib/runtime/smart-flow-bridge";
import { installOrbitCacheListener, registerQueryClient } from "@/lib/orbit/orbit-cache-invalidator";
import { useQueryClient } from "@tanstack/react-query";

let booted = false;

export function useMasterAppBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (booted) return;
    booted = true;

    // 0. Register queryClient for cache invalidation
    registerQueryClient(queryClient);
    booted = true;

    // 1. Platform event bus reactions (wallet ↔ orbit ↔ marketplace)
    const cleanupBus = installPlatformReactions();
    const cleanupStorefront = installStorefrontReactions();

    // 2. Cross-app integration (Wallet→Orbit, Booking→Orbit, Radar→Orbit, etc.)
    const cleanupCrossApp = installCrossAppReactions();

    // 3. Orchestration engine (order lifecycle events)
    installOrchestrationEngine();

    // 4. Engine connector hub (driver matching, escrow, state machine)
    installEngineConnectorHub();

    // 5. Smart flow bridge — runtime supervision (event audit, coupling detection, auto-validation)
    const cleanupFlowBridge = installSmartFlowBridge();

    // 6. Orbit cache auto-invalidation on events
    const cleanupOrbitCache = installOrbitCacheListener();

    // 6. Platform recovery — deferred well after initial render for speed
    const t1 = setTimeout(() => void runPlatformRecovery("boot"), 30000);

    return () => {
      clearTimeout(t1);
      cleanupBus();
      cleanupStorefront();
      cleanupCrossApp();
      cleanupFlowBridge();
      booted = false;
    };
  }, []);
}
