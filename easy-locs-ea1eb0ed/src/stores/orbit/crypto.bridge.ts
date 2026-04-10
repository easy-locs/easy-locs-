/**
 * orbit.crypto.bridge — E2EE bridge for Orbit messaging pipeline.
 *
 * Upgraded to use the Double Ratchet (Signal protocol) via e2ee-session-manager.
 * Each message gets a unique encryption key. Compromising one key does NOT
 * compromise past or future messages (forward + future secrecy).
 *
 * Usage:
 *   encryptMessageBody(conversationId, plaintext) → RatchetMessage (for DB/broadcast)
 *   decryptMessageBody(conversationId, ratchetMsg) → plaintext string
 */
import {
  e2eeEncrypt,
  e2eeDecrypt,
  hasActiveSession,
  destroySession,
  getSessionStats,
} from "@/lib/e2ee/e2ee-session-manager";
import type { RatchetMessage } from "@/lib/orbit-double-ratchet";

export interface ConversationKeyCache {
  get(conversationId: string): boolean;
  clear(): void;
}

export const conversationKeys: ConversationKeyCache = {
  get: (id) => hasActiveSession(id),
  clear: () => {},
};

export async function encryptMessageBody(
  conversationId: string,
  plaintext: string,
): Promise<RatchetMessage> {
  return e2eeEncrypt(conversationId, plaintext);
}

export async function decryptMessageBody(
  conversationId: string,
  ratchetMessage: RatchetMessage,
): Promise<string> {
  return e2eeDecrypt(conversationId, ratchetMessage);
}

export function isE2EEActive(conversationId: string): boolean {
  return hasActiveSession(conversationId);
}

export function clearE2EESession(conversationId: string): void {
  destroySession(conversationId);
}

export function getE2EEStats(conversationId: string) {
  return getSessionStats(conversationId);
}

export type { RatchetMessage };
