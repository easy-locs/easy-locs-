import type { PipelineEvent, ProposedTask, RegistryEntry } from './types';

const KEY_PROPOSALS = 'devos:evo:proposals';
const KEY_EVENTS = 'devos:evo:events';
const KEY_REGISTRY = 'devos:evo:registry';
const KEY_CONFIG = 'devos:evo:config';

const MAX_EVENTS = 500;
const MAX_PROPOSALS = 200;
const MAX_REGISTRY = 200;

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  const s = safeStorage();
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    // quota / serialization — silently drop, monitoring already keeps in-memory state
  }
}

export const evolutionPersistence = {
  loadProposals(): ProposedTask[] {
    return readJSON<ProposedTask[]>(KEY_PROPOSALS, []);
  },
  saveProposals(items: ProposedTask[]): void {
    writeJSON(KEY_PROPOSALS, items.slice(-MAX_PROPOSALS));
  },
  loadEvents(): PipelineEvent[] {
    return readJSON<PipelineEvent[]>(KEY_EVENTS, []);
  },
  saveEvents(items: PipelineEvent[]): void {
    writeJSON(KEY_EVENTS, items.slice(-MAX_EVENTS));
  },
  loadRegistry(): RegistryEntry[] {
    return readJSON<RegistryEntry[]>(KEY_REGISTRY, []);
  },
  saveRegistry(items: RegistryEntry[]): void {
    writeJSON(KEY_REGISTRY, items.slice(-MAX_REGISTRY));
  },
  loadConfigOverrides(): Record<string, unknown> | null {
    return readJSON<Record<string, unknown> | null>(KEY_CONFIG, null);
  },
  saveConfigOverrides(overrides: Record<string, unknown>): void {
    writeJSON(KEY_CONFIG, overrides);
  },
  clearAll(): void {
    const s = safeStorage();
    if (!s) return;
    [KEY_PROPOSALS, KEY_EVENTS, KEY_REGISTRY, KEY_CONFIG].forEach(k => {
      try { s.removeItem(k); } catch { /* ignore */ }
    });
  },
};
