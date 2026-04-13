/**
 * Send Guards — Thin delegation layer over the canonical send-locks system.
 * All guard state is now unified in families/orbit-dispatch/send-locks.ts.
 * This file preserves the legacy API surface for existing callers.
 */
import {
  acquireSubmitLock as canonicalAcquireSubmitLock,
  checkIdempotencyGuard,
} from "@/families/orbit-dispatch/send-locks";
import type { OrbitCommand } from "@/families/orbit-dispatch/orbit-commands";

/**
 * Check and acquire submit lock for a conversation.
 * Returns true if lock acquired (send allowed).
 * Delegates to the canonical send-locks guard.
 */
export function acquireSubmitLock(conversationId: string): boolean {
  const cmd = { type: "send_text", conversationId, body: "" } as OrbitCommand;
  return canonicalAcquireSubmitLock(cmd) !== null;
}

/**
 * Check content dedup — prevent identical content within window.
 * Delegates to the canonical idempotency guard in send-locks.
 */
export function isContentDuplicate(
  conversationId: string,
  content: string,
): boolean {
  const cmd = { type: "send_text", conversationId, body: content } as OrbitCommand;
  return !checkIdempotencyGuard(cmd);
}

/**
 * Release submit lock (no-op in the canonical system; TTL handles expiry).
 */
export function releaseSubmitLock(_conversationId: string): void {
  // The canonical lock system uses TTL-based expiry — no manual release needed.
}
