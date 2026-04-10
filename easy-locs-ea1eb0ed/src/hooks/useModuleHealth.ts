import { useState, useEffect, useCallback } from "react";
import { moduleRegistry, type PillarId, type ModuleStatus, type ModuleHealthSnapshot } from "@/lib/core/module-registry";
import { getOSHealthReport, type OSHealthReport } from "@/lib/core/os-status";
import { platformBus } from "@/lib/shared/platform-bus";

export function useModuleHealth(moduleId: string) {
  const [health, setHealth] = useState<ModuleHealthSnapshot | null>(
    () => moduleRegistry.getModuleHealth(moduleId)
  );

  useEffect(() => {
    setHealth(moduleRegistry.getModuleHealth(moduleId));

    const unsub = platformBus.on("system:module_status_changed", (event) => {
      const payload = event.payload as { moduleId?: string };
      if (payload?.moduleId === moduleId) {
        setHealth(moduleRegistry.getModuleHealth(moduleId));
      }
    });

    return unsub;
  }, [moduleId]);

  return health;
}

export function usePillarHealth(pillar: PillarId) {
  const [status, setStatus] = useState<ModuleStatus>("idle");
  const [modules, setModules] = useState<ModuleHealthSnapshot[]>([]);

  const refresh = useCallback(() => {
    const pillarHealth = moduleRegistry.getPillarHealth(pillar);
    setStatus(pillarHealth.status);
    setModules(pillarHealth.modules);
  }, [pillar]);

  useEffect(() => {
    refresh();

    const unsub = platformBus.on("system:module_status_changed", (event) => {
      const payload = event.payload as { moduleId?: string };
      const mod = moduleRegistry.getModule(payload?.moduleId || "");
      if (mod?.pillar === pillar) {
        refresh();
      }
    });

    return unsub;
  }, [pillar, refresh]);

  return { status, modules, refresh };
}

export function useOSHealth(refreshIntervalMs = 30_000) {
  const [report, setReport] = useState<OSHealthReport>(() => getOSHealthReport());

  useEffect(() => {
    setReport(getOSHealthReport());

    const interval = setInterval(() => {
      setReport(getOSHealthReport());
    }, refreshIntervalMs);

    const unsub = platformBus.on("system:module_status_changed", () => {
      setReport(getOSHealthReport());
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [refreshIntervalMs]);

  return report;
}
