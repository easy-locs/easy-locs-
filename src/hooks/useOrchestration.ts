import { useEffect } from "react";
import { installOrchestrationEngine } from "@/lib/orchestration/orchestrator";

export function useOrchestration() {
  useEffect(() => {
    installOrchestrationEngine();
  }, []);
}
