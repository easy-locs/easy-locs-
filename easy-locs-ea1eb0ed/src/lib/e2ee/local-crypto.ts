/**
 * Local Crypto — AES-256-GCM encrypt/decrypt for client-side E2EE.
 * Delegates heavy operations to crypto.worker via WorkerPoolManager
 * when available, falling back to main-thread Web Crypto API.
 */

import type { CryptoWorkerAPI } from "@/workers/crypto.worker";

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  algorithm: "AES-GCM";
}

let poolRef: typeof import("@/workers/pool-manager") | null = null;
let poolInitAttempted = false;

async function getPool() {
  if (poolRef) return poolRef;
  if (poolInitAttempted) return null;
  poolInitAttempted = true;
  try {
    poolRef = await import("@/workers/pool-manager");
    return poolRef;
  } catch {
    return null;
  }
}

function toBase64(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function fromBase64(base64: string) {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportRawKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(raw);
}

export async function importRawKey(rawBase64: string): Promise<CryptoKey> {
  const raw = fromBase64(rawBase64);
  return crypto.subtle.importKey(
    "raw",
    raw.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string, key: CryptoKey): Promise<EncryptedPayload> {
  const pool = await getPool();
  if (pool) {
    try {
      const rawKey = await exportRawKey(key);
      const result = await pool.workerPool.execute<CryptoWorkerAPI, { ciphertext: string; iv: string }>(
        "crypto",
        (proxy) => proxy.encrypt(text, rawKey),
      );
      return { ...result, algorithm: "AES-GCM" as const };
    } catch {}
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoded
  );

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    algorithm: "AES-GCM",
  };
}

export async function decryptText(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const pool = await getPool();
  if (pool) {
    try {
      const rawKey = await exportRawKey(key);
      return await pool.workerPool.execute<CryptoWorkerAPI, string>(
        "crypto",
        (proxy) => proxy.decrypt(payload.ciphertext, payload.iv, rawKey),
      );
    } catch {}
  }

  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );
  return new TextDecoder().decode(plain);
}
