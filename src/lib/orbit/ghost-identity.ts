/**
 * Ghost Identity & Crypto Utilities — Orbit security layer.
 * Session anonymization, payload encryption, identity masking.
 */

/** Generate a unique anonymous session ID */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/** Mask user identity for Ghost mode */
export function maskIdentity(user: { id: string; name?: string; avatar?: string }) {
  return {
    id: generateSessionId(),
    name: "Anonymous",
    avatar: undefined,
    originalId: undefined, // never leaked
  };
}

/**
 * Lightweight payload encryption (Base64 + AES-GCM when available).
 * For transit obfuscation — full E2EE uses the Double Ratchet layer.
 */
export async function encryptPayload(data: unknown, key?: CryptoKey): Promise<string> {
  const json = JSON.stringify(data);

  if (key && crypto.subtle) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(json);
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    const combined = new Uint8Array(iv.length + cipher.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(cipher), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  // Fallback: base64 obfuscation
  return btoa(encodeURIComponent(json));
}

/** Decrypt payload */
export async function decryptPayload(data: string, key?: CryptoKey): Promise<unknown> {
  if (key && crypto.subtle) {
    const raw = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const cipher = raw.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  // Fallback
  return JSON.parse(decodeURIComponent(atob(data)));
}

/** Generate a symmetric AES-GCM key for thread encryption */
export async function generateThreadKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/** Export key for storage */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** Import key from stored string */
export async function importKey(encoded: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}
