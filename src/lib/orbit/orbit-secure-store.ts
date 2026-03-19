/**
 * Orbit Secure Store — Namespaced local storage with secure wipe.
 * Separates Orbit / Ghost / Wallet key material.
 */

export type StoreNamespace = "orbit" | "ghost" | "wallet" | "call" | "session";

const NS_PREFIX: Record<StoreNamespace, string> = {
  orbit: "oss_orbit:",
  ghost: "oss_ghost:",
  wallet: "oss_wallet:",
  call: "oss_call:",
  session: "oss_session:",
};

function nsKey(ns: StoreNamespace, key: string): string {
  return `${NS_PREFIX[ns]}${key}`;
}

/** Store a value in a namespace */
export function orbitStoreSet(ns: StoreNamespace, key: string, value: string): void {
  try {
    localStorage.setItem(nsKey(ns, key), value);
  } catch {
    // Storage full — silent, non-blocking
  }
}

/** Retrieve a value from a namespace */
export function orbitStoreGet(ns: StoreNamespace, key: string): string | null {
  return localStorage.getItem(nsKey(ns, key));
}

/** Remove a single key from a namespace */
export function orbitStoreRemove(ns: StoreNamespace, key: string): void {
  localStorage.removeItem(nsKey(ns, key));
}

/** Clear all keys in a namespace */
export function orbitStoreClearNamespace(ns: StoreNamespace): void {
  const prefix = NS_PREFIX[ns];
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

/** Clear ALL Orbit secure store namespaces */
export function orbitStoreClearAll(): void {
  (Object.keys(NS_PREFIX) as StoreNamespace[]).forEach(orbitStoreClearNamespace);
}

/** Zero out a Uint8Array before dropping reference (best-effort secure wipe) */
export function secureWipeUint8Array(buf?: Uint8Array | null): void {
  if (!buf) return;
  crypto.getRandomValues(buf); // overwrite with random first
  buf.fill(0); // then zero
}

/** Wipe an ArrayBuffer */
export function secureWipeArrayBuffer(buf?: ArrayBuffer | null): void {
  if (!buf) return;
  secureWipeUint8Array(new Uint8Array(buf));
}

/** Store JSON in a namespace */
export function orbitStoreSetJSON(ns: StoreNamespace, key: string, value: unknown): void {
  orbitStoreSet(ns, key, JSON.stringify(value));
}

/** Retrieve parsed JSON from a namespace */
export function orbitStoreGetJSON<T = unknown>(ns: StoreNamespace, key: string): T | null {
  const raw = orbitStoreGet(ns, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
