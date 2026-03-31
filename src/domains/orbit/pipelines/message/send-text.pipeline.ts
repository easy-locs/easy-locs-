/**
 * sendTextPipeline — Canonical text message send pipeline.
 *
 * Steps:
 * 1. Validate input
 * 2. Build optimistic message
 * 3. Insert optimistic into store
 * 4. Enqueue send job
 * 5. Execute send (repository)
 * 6. Reconcile tempId → serverId
 * 7. Handle failure → status=failed
 */
import type { OrbitMessage } from "../../types";
import { generateIdempotencyKey, markMessageSeen, reconcileTempToServer } from "@/lib/dedup/message-dedup";
import { normalizeTextInput, validateTextInput as validateTextRaw } from "../../resolvers/text.resolver";

export interface SendTextInput {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  body: string;
  replyToId?: string | null;
  encrypted?: boolean;
}

export interface SendTextResult {
  ok: boolean;
  message?: OrbitMessage;
  error?: string;
}

/**
 * Step 1: Validate text input.
 */
export function validateTextInput(input: SendTextInput): string | null {
  if (!input.conversationId) return "missing_conversation_id";
  if (!input.senderId) return "missing_sender_id";
  const trimmed = (input.body || "").trim();
  if (!trimmed) return "empty_body";
  if (trimmed.length > 10_000) return "body_too_long";
  return null;
}

/**
 * Step 2: Build optimistic message.
 */
export function buildOptimisticTextMessage(input: SendTextInput): OrbitMessage {
  const tempId = crypto.randomUUID();
  const idempotencyKey = generateIdempotencyKey(input.senderId, input.conversationId, tempId);

  // Pre-mark in dedup to prevent realtime echo
  markMessageSeen({ tempId, idempotencyKey });

  return {
    id: tempId, // Will be replaced after reconciliation
    tempId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    type: "text",
    text: input.body.trim(),
    attachmentIds: [],
    replyToId: input.replyToId || null,
    reactionSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    status: "sending",
    isDeleted: false,
    isEdited: false,
    metadata: { tempId, idempotencyKey, schemaVersion: 1 },
  };
}

/**
 * Step 6: Reconcile optimistic message with server response.
 */
export function reconcileTextMessage(
  optimistic: OrbitMessage,
  serverData: any,
): OrbitMessage {
  const serverId = serverData.id || serverData.message_id;
  if (optimistic.tempId && serverId) {
    reconcileTempToServer(optimistic.tempId, serverId);
  }

  return {
    ...optimistic,
    id: serverId || optimistic.id,
    status: "sent",
    createdAt: serverData.created_at || optimistic.createdAt,
    metadata: { ...optimistic.metadata, ...serverData.metadata },
  };
}
