/**
 * Instant Delivery System — WhatsApp-grade message lifecycle.
 *
 * T0+0ms  → message visible (local insert, status: sending ⏳)
 * T0+ACK  → server confirmed (status: sent ✓)
 * T0+RECV → recipient received (status: delivered ✓✓)
 * T0+READ → recipient read (status: read ✓✓ blue)
 *
 * Single source of truth: version-controlled updates.
 * Each status transition increments version → no stale overwrite.
 */
import type { CanonicalDeliveryStatus } from "@/families/messages/canonical-envelope";
import { applyVersion } from "./flow-core";

// ── Status Machine (strict monotonic transitions) ──
const STATUS_ORDER: Record<CanonicalDeliveryStatus, number> = {
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: -1,
};

/**
 * Can only transition forward (sending → sent → delivered → read).
 * Exception: any status can transition to "failed".
 */
export function canTransitionStatus(
  current: CanonicalDeliveryStatus,
  next: CanonicalDeliveryStatus,
): boolean {
  if (next === "failed") return true;
  if (current === "failed" && next === "sending") return true; // retry
  return STATUS_ORDER[next] > STATUS_ORDER[current];
}

// ── Instant Message Factory ──
export interface InstantMessage {
  id: string;
  conversationId: string;
  type: string;
  body: string;
  senderUserId: string;
  senderOrbitId: string;
  status: CanonicalDeliveryStatus;
  preview: boolean;
  localUrl: string | null;
  progress: number;
  createdAt: number;
  version: number;
}

let instantCounter = 0;

export function createInstantMessage(input: {
  conversationId: string;
  type: string;
  body: string;
  senderUserId: string;
  senderOrbitId: string;
  localUrl?: string | null;
}): InstantMessage {
  return {
    id: `tmp_${Date.now()}_${++instantCounter}`,
    conversationId: input.conversationId,
    type: input.type,
    body: input.body,
    senderUserId: input.senderUserId,
    senderOrbitId: input.senderOrbitId,
    status: "sending",
    preview: true,
    localUrl: input.localUrl || null,
    progress: 0,
    createdAt: Date.now(),
    version: 1,
  };
}

// ── Status Transition Helpers ──

/**
 * Server ACK received → ✓
 * Replaces tempId with serverId.
 */
export function onServerAck(tempId: string, serverId: string): StatusUpdate {
  return {
    tempId,
    serverId,
    status: "sent",
    preview: false,
    version: 2,
  };
}

/**
 * Recipient received → ✓✓
 */
export function onDelivered(messageId: string): StatusUpdate {
  return {
    messageId,
    status: "delivered",
    version: 3,
  };
}

/**
 * Recipient read → ✓✓ blue
 */
export function onRead(messageId: string): StatusUpdate {
  return {
    messageId,
    status: "read",
    version: 4,
  };
}

/**
 * Send failed → retry possible
 */
export function onFailed(messageId: string, error?: string): StatusUpdate {
  return {
    messageId,
    status: "failed",
    error,
    version: -1, // special: always applied
  };
}

/**
 * Upload progress update
 */
export function onProgress(messageId: string, percent: number): ProgressUpdate {
  return {
    messageId,
    progress: Math.min(100, Math.max(0, percent)),
  };
}

export interface StatusUpdate {
  tempId?: string;
  serverId?: string;
  messageId?: string;
  status: CanonicalDeliveryStatus;
  preview?: boolean;
  version: number;
  error?: string;
}

export interface ProgressUpdate {
  messageId: string;
  progress: number;
}
