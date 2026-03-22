/**
 * Ghost Crypto — AES-GCM encryption for ghost payloads.
 * Separate key domain from chat/wallet.
 */

export async function generateGhostThreadKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportGhostKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importGhostKey(encoded: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function encryptGhostPayload(
  plaintext: string,
  key: CryptoKey,
  aad?: string
): Promise<{ ciphertext: string; nonce: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const params: AesGcmParams = { name: "AES-GCM", iv };
  if (aad) params.additionalData = new TextEncoder().encode(aad);

  const cipher = await crypto.subtle.encrypt(params, key, encoded);
  const combined = new Uint8Array(cipher);

  return {
    ciphertext: btoa(String.fromCharCode(...combined)),
    nonce: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptGhostPayload(
  ciphertext: string,
  nonce: string,
  key: CryptoKey,
  aad?: string
): Promise<string> {
  const iv = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  const params: AesGcmParams = { name: "AES-GCM", iv };
  if (aad) params.additionalData = new TextEncoder().encode(aad);

  const decrypted = await crypto.subtle.decrypt(params, key, data);
  return new TextDecoder().decode(decrypted);
}

// ─── Key Derivation per thread ───────────────────────────

export async function deriveThreadKey(
  masterKey: CryptoKey,
  threadId: string
): Promise<CryptoKey> {
  const rawMaster = await crypto.subtle.exportKey("raw", masterKey);
  const salt = new TextEncoder().encode(`ghost:thread:${threadId}`);

  const baseKey = await crypto.subtle.importKey("raw", rawMaster, "HKDF", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("ghost-thread-key") },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}
