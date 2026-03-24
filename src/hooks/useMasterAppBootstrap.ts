import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";
import { runPlatformRecovery } from "@/lib/platform/platform-recovery-engine";
import { startContinuousEngine } from "@/lib/platform/platform-continuous-engine";
import { runEngineHealthChecks } from "@/lib/engine/engineHealthChecks";

export function useMasterAppBootstrap() {
  useEffect(() => {
    // 1. Install event-driven engines
    installOrchestrationEngine();
    installEngineConnectorHub();

    // 2. Run immediate health checks
    void runEngineHealthChecks();

    // 3. Platform recovery at boot (after initial render)
    setTimeout(() => {
      void runPlatformRecovery("boot");
    }, 5000);

    // 4. Start continuous engine (interval-based automation)
    setTimeout(() => {
      startContinuousEngine();
    }, 10000);

    return () => {
      // Cleanup not needed for singleton engines, but continuous engine can stop
    };
  }, []);
}
