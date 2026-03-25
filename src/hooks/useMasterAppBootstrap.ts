import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";
import { runPlatformRecovery } from "@/lib/platform/platform-recovery-engine";
import { runEngineHealthChecks } from "@/lib/engine/engineHealthChecks";

export function useMasterAppBootstrap() {
  useEffect(() => {
    // 1. Install event-driven engines (lightweight, sync)
    installOrchestrationEngine();
    installEngineConnectorHub();

    // 2. Run health checks after initial paint
    const t1 = setTimeout(() => void runEngineHealthChecks(), 3000);

    // 3. Platform recovery — well after initial render
    const t2 = setTimeout(() => void runPlatformRecovery("boot"), 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
}
