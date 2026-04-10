const STORAGE_KEY = "el-engine-flags";
const FLAG_VERSION = 1;

interface FlagStore {
  version: number;
  flags: Record<string, boolean>;
}

let cache: FlagStore | null = null;

function loadFlags(): FlagStore {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FlagStore;
      if (parsed.version === FLAG_VERSION) {
        cache = parsed;
        return cache;
      }
    }
  } catch {}
  cache = { version: FLAG_VERSION, flags: {} };
  return cache;
}

function saveFlags(): void {
  if (!cache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

export function isEngineEnabled(engineId: string): boolean {
  const store = loadFlags();
  return store.flags[engineId] !== false;
}

export function setEngineEnabled(engineId: string, enabled: boolean): void {
  const store = loadFlags();
  store.flags[engineId] = enabled;
  saveFlags();
}

export function toggleEngine(engineId: string): boolean {
  const current = isEngineEnabled(engineId);
  setEngineEnabled(engineId, !current);
  return !current;
}

export function getAllFlags(): Record<string, boolean> {
  return { ...loadFlags().flags };
}

export function resetAllFlags(): void {
  cache = { version: FLAG_VERSION, flags: {} };
  saveFlags();
}
