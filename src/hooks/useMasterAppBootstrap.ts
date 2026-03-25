import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";
import { installPlatformReactions } from "@/lib/shared/platform-bus";
import { installStorefrontReactions } from "@/lib/shared/storefront-reactions";
import { runPlatformRecovery } from "@/lib/platform/platform-recovery-engine";

let booted = false;

export function useMasterAppBootstrap() {
  useEffect(() => {
    if (booted) return;
    booted = true;

    // 1. Platform event bus reactions (wallet ↔ orbit ↔ marketplace)
    const cleanupBus = installPlatformReactions();
    const cleanupStorefront = installStorefrontReactions();

    // 2. Orchestration engine (order lifecycle events)
    installOrchestrationEngine();

    // 3. Engine connector hub (driver matching, escrow, state machine)
    installEngineConnectorHub();

    // 4. Platform recovery — after initial render
    const t1 = setTimeout(() => void runPlatformRecovery("boot"), 8000);

    return () => {
      clearTimeout(t1);
      cleanupBus();
      cleanupStorefront();
      booted = false;
    };
  }, []);
}
