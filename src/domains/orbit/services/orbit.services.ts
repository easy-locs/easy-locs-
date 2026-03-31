/**
 * Orbit Canonical Services — SINGLE WRITE PATH for all Orbit actions.
 * 
 * Every write goes through here. No other entry point allowed.
 * 
 * Pattern per action:
 *   validate → buildOptimistic → insertStore → enqueue → execute → reconcile
 */
import type {
  OrbitMessage,
  OrbitConversation,
  OrbitAttachment,
  MessageStatus,
} from "@/domains/orbit/types";
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateTextInput,
  buildOptimisticTextMessage,
  reconcileTextMessage,
} from "@/domains/orbit/pipelines/message/send-text.pipeline";
import {
  validateMediaInput,
  buildLocalAttachment,
  buildOptimisticMediaMessage,
} from "@/domains/orbit/pipelines/message/send-media.pipeline";
import {
  validateVoiceInput,
  buildLocalVoiceAttachment,
  buildOptimisticVoiceMessage,
} from "@/domains/orbit/pipelines/message/send-voice.pipeline";
import { findOrCreateDirect } from "@/domains/orbit/pipelines/conversation/find-or-create-direct.pipeline";
import { acquireSubmitLock, isContentDuplicate } from "@/domains/orbit/guards/send-guard";
import { logOrbit } from "@/lib/observability/orbit-observability";

// ══════════════════════════════════════════════
// TEXT MESSAGE
// ══════════════════════════════════════════════

export async function sendTextMessage(input: {
  conversationId: string;
  senderId: string;
  senderOrbitId: string | null;
  text: string;
  replyToId?: string | null;
}): Promise<{ ok: boolean; tempId?: string; error?: string }> {
  // Guard: anti-double-tap
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  // Guard: content dedup
  if (isContentDuplicate(input.conversationId, input.text)) {
    return { ok: false, error: "content_duplicate" };
  }

  // Validate
  const validation = validateTextInput({ text: input.text, conversationId: input.conversationId });
  if (!validation.valid) {
    return { ok: false, error: validation.reason };
  }

  // Build optimistic
  const optimistic = buildOptimisticTextMessage({
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    text: input.text.trim(),
    replyToId: input.replyToId ?? null,
  });

  // Insert into store immediately (optimistic UI)
  useOrbitStore.getState().mergeMessage(optimistic);
  logOrbit("message_send_started", { tempId: optimistic.tempId, conversationId: input.conversationId });

  return { ok: true, tempId: optimistic.tempId ?? optimistic.id };
}

// ══════════════════════════════════════════════
// MEDIA MESSAGE
// ══════════════════════════════════════════════

export async function sendMediaMessage(input: {
  conversationId: string;
  senderId: string;
  senderOrbitId: string | null;
  file: File;
  caption?: string;
}): Promise<{ ok: boolean; tempId?: string; attachmentId?: string; error?: string }> {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  const validation = validateMediaInput({ file: input.file });
  if (!validation.valid) {
    return { ok: false, error: validation.reason };
  }

  // Build local attachment
  const attachment = buildLocalAttachment({
    file: input.file,
    conversationId: input.conversationId,
  });

  // Build optimistic message
  const optimistic = buildOptimisticMediaMessage({
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    attachmentId: attachment.id,
    caption: input.caption ?? null,
  });

  // Insert both into store
  const store = useOrbitStore.getState();
  store.mergeAttachment(attachment);
  store.mergeMessage(optimistic);

  logOrbit("message_send_started", { tempId: optimistic.tempId, type: "media" });

  return { ok: true, tempId: optimistic.tempId ?? optimistic.id, attachmentId: attachment.id };
}

// ══════════════════════════════════════════════
// VOICE MESSAGE
// ══════════════════════════════════════════════

export async function sendVoiceMessage(input: {
  conversationId: string;
  senderId: string;
  senderOrbitId: string | null;
  blob: Blob;
  durationSeconds: number;
}): Promise<{ ok: boolean; tempId?: string; error?: string }> {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  const validation = validateVoiceInput({
    blob: input.blob,
    durationSeconds: input.durationSeconds,
  });
  if (!validation.valid) {
    return { ok: false, error: validation.reason };
  }

  const attachment = buildLocalVoiceAttachment({
    blob: input.blob,
    durationSeconds: input.durationSeconds,
    conversationId: input.conversationId,
  });

  const optimistic = buildOptimisticVoiceMessage({
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    attachmentId: attachment.id,
    durationSeconds: input.durationSeconds,
  });

  const store = useOrbitStore.getState();
  store.mergeAttachment(attachment);
  store.mergeMessage(optimistic);

  logOrbit("message_send_started", { tempId: optimistic.tempId, type: "voice" });

  return { ok: true, tempId: optimistic.tempId ?? optimistic.id };
}

// ══════════════════════════════════════════════
// CREATE DIRECT CONVERSATION
// ══════════════════════════════════════════════

export async function createDirectConversation(input: {
  myUserId: string;
  myOrbitId: string;
  peerUserId: string;
  peerOrbitId: string;
}): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
  try {
    const result = await findOrCreateDirect({
      myUserId: input.myUserId,
      myOrbitId: input.myOrbitId,
      peerUserId: input.peerUserId,
      peerOrbitId: input.peerOrbitId,
    });

    if (result.conversation) {
      useOrbitStore.getState().mergeConversation(result.conversation);
      return { ok: true, conversationId: result.conversation.id };
    }

    return { ok: false, error: "create_failed" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ══════════════════════════════════════════════
// MARK READ
// ══════════════════════════════════════════════

export function markConversationRead(conversationId: string): void {
  useOrbitStore.getState().updateUnreadCount(conversationId, 0);
  logOrbit("mark_read", { conversationId });
}

// ══════════════════════════════════════════════
// RECONCILE (called by realtime/transport on ack)
// ══════════════════════════════════════════════

export function reconcileServerMessage(tempId: string, serverMsg: OrbitMessage): void {
  useOrbitStore.getState().reconcileMessage(tempId, serverMsg);
  logOrbit("message_reconciled", { tempId, serverId: serverMsg.id });
}

// ══════════════════════════════════════════════
// UPDATE MESSAGE STATUS
// ══════════════════════════════════════════════

export function transitionMessageStatus(messageId: string, status: MessageStatus): void {
  useOrbitStore.getState().updateMessageStatus(messageId, status);
}
