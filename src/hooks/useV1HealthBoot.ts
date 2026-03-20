import { useEffect } from "react";
import { runEngineHealthChecks } from "@/lib/engine/engineHealthChecks";

export function useV1HealthBoot() {
  useEffect(() => {
    runEngineHealthChecks().catch(() => {});
  }, []);
}
