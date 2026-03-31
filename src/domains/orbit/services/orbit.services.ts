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
  MessageStatus,
} from "@/domains/orbit/types";
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateTextInput,
  buildOptimisticTextMessage,
  reconcileTextMessage,
  type SendTextInput,
} from "@/domains/orbit/pipelines/message/send-text.pipeline";
import {
  validateMediaInput,
  buildLocalAttachment,
  buildOptimisticMediaMessage,
  type SendMediaInput,
} from "@/domains/orbit/pipelines/message/send-media.pipeline";
import {
  validateVoiceInput,
  buildLocalVoiceAttachment,
  buildOptimisticVoiceMessage,
  type SendVoiceInput,
} from "@/domains/orbit/pipelines/message/send-voice.pipeline";
import { findOrCreateDirect } from "@/domains/orbit/pipelines/conversation/find-or-create-direct.pipeline";
import { acquireSubmitLock, isContentDuplicate } from "@/domains/orbit/guards/send-guard";
import { logMessageSendStarted, logMessageReconciled } from "@/lib/observability/orbit-observability";

// ══════════════════════════════════════════════
// TEXT MESSAGE
// ══════════════════════════════════════════════

export async function sendTextMessage(input: {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  text: string;
  replyToId?: string | null;
}): Promise<{ ok: boolean; tempId?: string; error?: string }> {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }
  if (isContentDuplicate(input.conversationId, input.text)) {
    return { ok: false, error: "content_duplicate" };
  }

  const pipelineInput: SendTextInput = {
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    body: input.text,
    replyToId: input.replyToId ?? null,
  };

  const validationError = validateTextInput(pipelineInput);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const optimistic = buildOptimisticTextMessage(pipelineInput);
  useOrbitStore.getState().mergeMessage(optimistic);
  logMessageSendStarted(input.conversationId, optimistic.tempId ?? optimistic.id);

  return { ok: true, tempId: optimistic.tempId ?? optimistic.id };
}

// ══════════════════════════════════════════════
// MEDIA MESSAGE
// ══════════════════════════════════════════════

export async function sendMediaMessage(input: {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  file: File;
  caption?: string;
}): Promise<{ ok: boolean; tempId?: string; attachmentId?: string; error?: string }> {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  const pipelineInput: SendMediaInput = {
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    file: input.file,
    caption: input.caption,
  };

  const validationError = validateMediaInput(pipelineInput);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const previewUrl = input.file.type.startsWith("image/") ? URL.createObjectURL(input.file) : null;
  const attachment = buildLocalAttachment(pipelineInput, previewUrl);
  const optimistic = buildOptimisticMediaMessage(pipelineInput, attachment);

  const store = useOrbitStore.getState();
  store.mergeAttachment(attachment);
  store.mergeMessage(optimistic);
  logMessageSendStarted(input.conversationId, optimistic.tempId ?? optimistic.id);

  return { ok: true, tempId: optimistic.tempId ?? optimistic.id, attachmentId: attachment.id };
}

// ══════════════════════════════════════════════
// VOICE MESSAGE
// ══════════════════════════════════════════════

export async function sendVoiceMessage(input: {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  blob: Blob;
  durationSeconds: number;
  localUrl: string;
}): Promise<{ ok: boolean; tempId?: string; error?: string }> {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  const pipelineInput: SendVoiceInput = {
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    blob: input.blob,
    durationSeconds: input.durationSeconds,
    localUrl: input.localUrl,
  };

  const validationError = validateVoiceInput(pipelineInput);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const attachment = buildLocalVoiceAttachment(pipelineInput);
  const optimistic = buildOptimisticVoiceMessage(pipelineInput, attachment);

  const store = useOrbitStore.getState();
  store.mergeAttachment(attachment);
  store.mergeMessage(optimistic);
  logMessageSendStarted(input.conversationId, optimistic.tempId ?? optimistic.id);

  return { ok: true, tempId: optimistic.tempId ?? optimistic.id };
}

// ══════════════════════════════════════════════
// CREATE DIRECT CONVERSATION
// ══════════════════════════════════════════════

export async function createDirectConversation(input: {
  myUserId: string;
  peerUserId: string;
  searchFn: (pair: string[]) => Promise<any | null>;
  createFn: (pair: string[]) => Promise<any>;
}): Promise<{ ok: boolean; conversation?: any; error?: string }> {
  try {
    const result = await findOrCreateDirect(
      input.myUserId,
      input.peerUserId,
      input.searchFn,
      input.createFn,
    );
    return { ok: true, conversation: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ══════════════════════════════════════════════
// MARK READ
// ══════════════════════════════════════════════

export function markConversationRead(conversationId: string): void {
  useOrbitStore.getState().updateUnreadCount(conversationId, 0);
}

// ══════════════════════════════════════════════
// RECONCILE (called by realtime/transport on ack)
// ══════════════════════════════════════════════

export function reconcileServerMessage(tempId: string, serverMsg: OrbitMessage): void {
  useOrbitStore.getState().reconcileMessage(tempId, serverMsg);
  logMessageReconciled(tempId, serverMsg.id);
}

// ══════════════════════════════════════════════
// UPDATE MESSAGE STATUS
// ══════════════════════════════════════════════

export function transitionMessageStatus(messageId: string, status: MessageStatus): void {
  useOrbitStore.getState().updateMessageStatus(messageId, status);
}
