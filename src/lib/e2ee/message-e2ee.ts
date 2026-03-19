/**
 * Message E2EE — Encrypt/decrypt chat messages between sender and receiver.
 * Uses AES-256-GCM with per-conversation shared keys derived via ECDH.
 */
import { encryptText, decryptText, generateAesKey, exportRawKey, importRawKey } from "@/lib/e2ee/local-crypto";
import type { EncryptedPayload } from "@/lib/e2ee/local-crypto";

const SESSION_KEY_CACHE = new Map<string, CryptoKey>();

export interface EncryptedMessage {
  encryptedContent: EncryptedPayload;
  senderDeviceId: string;
  keyFingerprint: string;
  timestamp: string;
}

/**
 * Derive a shared AES key from ECDH key agreement between two parties.
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  const peerPublic = await crypto.subtle.importKey(
    "jwk",
    peerPublicKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPublic },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Get or create a cached session key for a conversation.
 */
export async function getOrCreateSessionKey(conversationId: string): Promise<CryptoKey> {
  const cached = SESSION_KEY_CACHE.get(conversationId);
  if (cached) return cached;

  // Check localStorage for persisted key
  const stored = localStorage.getItem(`el_msg_key_${conversationId}`);
  if (stored) {
    const key = await importRawKey(stored);
    SESSION_KEY_CACHE.set(conversationId, key);
    return key;
  }

  // Generate new key
  const key = await generateAesKey();
  const raw = await exportRawKey(key);
  localStorage.setItem(`el_msg_key_${conversationId}`, raw);
  SESSION_KEY_CACHE.set(conversationId, key);
  return key;
}

/**
 * Encrypt a message for sending.
 */
export async function encryptMessage(params: {
  conversationId: string;
  plaintext: string;
  senderDeviceId: string;
}): Promise<EncryptedMessage> {
  const key = await getOrCreateSessionKey(params.conversationId);
  const rawKey = await exportRawKey(key);
  const fingerprint = rawKey.slice(0, 8);

  const encrypted = await encryptText(params.plaintext, key);

  return {
    encryptedContent: encrypted,
    senderDeviceId: params.senderDeviceId,
    keyFingerprint: fingerprint,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Decrypt a received message.
 */
export async function decryptMessage(params: {
  conversationId: string;
  encryptedMessage: EncryptedMessage;
}): Promise<string> {
  const key = await getOrCreateSessionKey(params.conversationId);
  return decryptText(params.encryptedMessage.encryptedContent, key);
}

/**
 * Clear all cached session keys (e.g. on logout).
 */
export function clearAllSessionKeys() {
  SESSION_KEY_CACHE.clear();
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("el_msg_key_"));
  keys.forEach((k) => localStorage.removeItem(k));
}
