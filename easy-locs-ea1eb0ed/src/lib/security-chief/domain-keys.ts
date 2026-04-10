import type { SecurityDomain } from "./types";
import { secureStore } from "./native-secure-store";
import { nowIso, randomHex } from "./utils";

export interface VersionedDomainKeyMeta {
  domain: SecurityDomain;
  keyId: string;
  createdAt: string;
  expiresAt: string;
  previousKeyIds: string[];
}

const memCache = new Map<string, CryptoKey>();

function keyStorage(domain: SecurityDomain, keyId: string) {
  return `sec_chief_key_${domain}_${keyId}`;
}

function metaStorage(domain: SecurityDomain) {
  return `sec_chief_meta_${domain}`;
}

export async function createVersionedAesKey(
  domain: SecurityDomain,
  ttlHours: number,
  previousKeyIds: string[] = []
): Promise<VersionedDomainKeyMeta> {
  const keyId = `k_${domain}_${randomHex(8)}`;
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);

  await secureStore.set(keyStorage(domain, keyId), btoa(String.fromCharCode(...new Uint8Array(raw))));

  const meta: VersionedDomainKeyMeta = {
    domain,
    keyId,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
    previousKeyIds,
  };

  await secureStore.set(metaStorage(domain), JSON.stringify(meta));
  memCache.set(`${domain}:${keyId}`, key);
  return meta;
}

export async function getCurrentDomainKeyMeta(domain: SecurityDomain): Promise<VersionedDomainKeyMeta | null> {
  const raw = await secureStore.get(metaStorage(domain));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VersionedDomainKeyMeta;
  } catch {
    return null;
  }
}

export async function getOrCreateCurrentDomainKeyMeta(domain: SecurityDomain, ttlHours: number) {
  const current = await getCurrentDomainKeyMeta(domain);
  if (!current) return createVersionedAesKey(domain, ttlHours);
  return current;
}

export async function getDomainKey(domain: SecurityDomain, keyId: string): Promise<CryptoKey> {
  const cacheKey = `${domain}:${keyId}`;
  const cached = memCache.get(cacheKey);
  if (cached) return cached;

  const raw = await secureStore.get(keyStorage(domain, keyId));
  if (!raw) throw new Error(`Missing domain key: ${domain}/${keyId}`);

  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const key = await crypto.subtle.importKey(
    "raw",
    bytes.buffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  memCache.set(cacheKey, key);
  return key;
}

export async function rotateDomainKey(domain: SecurityDomain, ttlHours: number): Promise<VersionedDomainKeyMeta> {
  const current = await getCurrentDomainKeyMeta(domain);
  const prev = current ? [current.keyId, ...current.previousKeyIds].slice(0, 4) : [];
  return createVersionedAesKey(domain, ttlHours, prev);
}
