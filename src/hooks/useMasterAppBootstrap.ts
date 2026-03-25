import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";
import { runPlatformRecovery } from "@/lib/platform/platform-recovery-engine";

export function useMasterAppBootstrap() {
  useEffect(() => {
    // 1. Install event-driven engines (lightweight, sync)
    installOrchestrationEngine();
    installEngineConnectorHub();

    // 2. Platform recovery — after initial render
    const t1 = setTimeout(() => void runPlatformRecovery("boot"), 8000);

    return () => {
      clearTimeout(t1);
    };
  }, []);
}
