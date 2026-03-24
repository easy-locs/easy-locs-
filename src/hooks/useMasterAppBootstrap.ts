import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";
import { runPlatformRecovery } from "@/lib/platform/platform-recovery-engine";

export function useMasterAppBootstrap() {
  useEffect(() => {
    installOrchestrationEngine();
    installEngineConnectorHub();

    // Platform auto-recovery: runs backend health checks + audits at boot
    setTimeout(() => {
      void runPlatformRecovery("boot");
    }, 5000);
  }, []);
}
