/**
 * voice.service — Single entry point for voice message sends.
 * Delegates to canonical pipelines. No UI logic, no recorder state.
 *
 * Entry point:
 *   sendVoice(input) — finalized voice note send
 */
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateVoiceInput,
  buildLocalVoiceAttachment,
  buildOptimisticVoiceMessage,
  type SendVoiceInput,
} from "@/domains/orbit/pipelines/message/send-voice.pipeline";
import { acquireSubmitLock } from "@/domains/orbit/guards/send-guard";
import { logMessageSendStarted } from "@/lib/observability/orbit-observability";

export interface VoiceSendResult {
  ok: boolean;
  tempId?: string;
  attachmentId?: string;
  error?: string;
}

/**
 * sendVoice — Single voice note send.
 * validate → local attachment → optimistic message → store merge
 */
export function sendVoice(input: SendVoiceInput): VoiceSendResult {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  const validationError = validateVoiceInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const attachment = buildLocalVoiceAttachment(input);
  const optimistic = buildOptimisticVoiceMessage(input, attachment);

  const store = useOrbitMessagingStore.getState();
  store.mergeAttachment(attachment);
  store.mergeMessage(optimistic);

  logMessageSendStarted(input.conversationId, optimistic.tempId ?? optimistic.id);

  return {
    ok: true,
    tempId: optimistic.tempId ?? optimistic.id,
    attachmentId: attachment.id,
  };
}

/**
 * reconcileVoiceUpload — Called when voice upload completes.
 */
export function reconcileVoiceUpload(attachmentId: string, remoteUrl: string): void {
  useOrbitMessagingStore.getState().updateAttachmentUpload(attachmentId, {
    remoteUrl,
    uploadStatus: "uploaded",
    uploadProgress: 100,
  });
}

/**
 * failVoiceUpload — Called when voice upload fails.
 */
export function failVoiceUpload(attachmentId: string): void {
  useOrbitMessagingStore.getState().updateAttachmentUpload(attachmentId, {
    uploadStatus: "failed",
  });
}
