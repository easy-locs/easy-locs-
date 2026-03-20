import { DEFAULT_ENGINE_REGISTRY, EngineModuleState, EngineModuleKey } from "@/lib/engine/centralEngineRegistry";

let engineRegistry: EngineModuleState[] = [...DEFAULT_ENGINE_REGISTRY];

export function getEngineRegistry(): EngineModuleState[] {
  return [...engineRegistry];
}

export function setEngineHealth(key: EngineModuleKey, healthy: boolean, notes?: string) {
  engineRegistry = engineRegistry.map((row) =>
    row.key === key
      ? { ...row, healthy, notes: notes ?? row.notes, lastCheckAt: new Date().toISOString() }
      : row
  );
}

export function setEngineEnabled(key: EngineModuleKey, enabled: boolean) {
  engineRegistry = engineRegistry.map((row) =>
    row.key === key ? { ...row, enabled } : row
  );
}

export function resetEngineRegistry() {
  engineRegistry = [...DEFAULT_ENGINE_REGISTRY];
}
