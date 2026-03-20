import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";

export function useMasterAppBootstrap() {
  useEffect(() => {
    installOrchestrationEngine();
    installEngineConnectorHub();
  }, []);
}
