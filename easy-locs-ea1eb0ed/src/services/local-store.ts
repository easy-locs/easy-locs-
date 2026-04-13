/**
 * local-store — Centralized localStorage/sessionStorage access layer.
 * All browser storage access must go through this service.
 *
 * Namespaced by pillar:
 *   - dashboard: Dashboard pillar state
 *   - radar:     Radar / nearby / social pillar
 *   - orbit:     Orbit messaging & identity
 *   - wallet:    Wallet & payments
 *   - me:        User profile & preferences
 *   - auth:      Authentication state
 *   - system:    Cross-cutting system state
 */

export type StorePillar =
  | "dashboard"
  | "radar"
  | "orbit"
  | "wallet"
  | "me"
  | "auth"
  | "system";

const PREFIX = "el";

function key(pillar: StorePillar, name: string): string {
  return `${PREFIX}:${pillar}:${name}`;
}

function safeGet(storage: Storage, k: string): string | null {
  try {
    return storage.getItem(k);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, k: string, value: string): void {
  try {
    storage.setItem(k, value);
  } catch {
    // quota exceeded or private mode — fail silently
  }
}

function safeRemove(storage: Storage, k: string): void {
  try {
    storage.removeItem(k);
  } catch {
    // ignore
  }
}

export const localStore = {
  get(pillar: StorePillar, name: string): string | null {
    return safeGet(localStorage, key(pillar, name));
  },

  set(pillar: StorePillar, name: string, value: string): void {
    safeSet(localStorage, key(pillar, name), value);
  },

  remove(pillar: StorePillar, name: string): void {
    safeRemove(localStorage, key(pillar, name));
  },

  getJson<T>(pillar: StorePillar, name: string): T | null {
    const raw = safeGet(localStorage, key(pillar, name));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJson<T>(pillar: StorePillar, name: string, value: T): void {
    try {
      safeSet(localStorage, key(pillar, name), JSON.stringify(value));
    } catch {
      // ignore
    }
  },

  clearPillar(pillar: StorePillar): void {
    const prefix = `${PREFIX}:${pillar}:`;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },

  clearAll(): void {
    const prefix = `${PREFIX}:`;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};

export const sessionStore = {
  get(pillar: StorePillar, name: string): string | null {
    return safeGet(sessionStorage, key(pillar, name));
  },

  set(pillar: StorePillar, name: string, value: string): void {
    safeSet(sessionStorage, key(pillar, name), value);
  },

  remove(pillar: StorePillar, name: string): void {
    safeRemove(sessionStorage, key(pillar, name));
  },

  getJson<T>(pillar: StorePillar, name: string): T | null {
    const raw = safeGet(sessionStorage, key(pillar, name));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJson<T>(pillar: StorePillar, name: string, value: T): void {
    try {
      safeSet(sessionStorage, key(pillar, name), JSON.stringify(value));
    } catch {
      // ignore
    }
  },
};
