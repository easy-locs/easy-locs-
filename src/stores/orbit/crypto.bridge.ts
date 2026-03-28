/**
 * orbit.crypto.bridge — E2EE key management bridge for Orbit.
 * Wraps orbit-crypto / local-crypto for message and file encryption.
 * Zero state, zero DB, pure crypto coordination.
 */

import { encryptText, decryptText, generateAesKey, exportRawKey, importRawKey } from "@/lib/e2ee/local-crypto";
import type { EncryptedPayload } from "@/lib/e2ee/local-crypto";

export interface ConversationKeyCache {
  get(conversationId: string): CryptoKey | null;
  set(conversationId: string, key: CryptoKey): void;
  clear(): void;
}

/** In-memory key cache for active conversations */
const keyCache = new Map<string, CryptoKey>();

export const conversationKeys: ConversationKeyCache = {
  get: (id) => keyCache.get(id) ?? null,
  set: (id, key) => keyCache.set(id, key),
  clear: () => keyCache.clear(),
};

/** Encrypt a message body for a conversation */
export async function encryptMessageBody(
  conversationId: string,
  plaintext: string
): Promise<{ encrypted: EncryptedPayload; keyB64: string } | null> {
  let key = conversationKeys.get(conversationId);
  if (!key) {
    key = await generateAesKey();
    conversationKeys.set(conversationId, key);
  }
  const encrypted = await encryptText(plaintext, key);
  const keyB64 = await exportRawKey(key);
  return { encrypted, keyB64 };
}

/** Decrypt a message body */
export async function decryptMessageBody(
  payload: EncryptedPayload,
  keyB64: string
): Promise<string> {
  const key = await importRawKey(keyB64);
  return decryptText(payload, key);
}
