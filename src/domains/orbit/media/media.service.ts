/**
 * media.service — Single entry point for all media message sends.
 * Delegates to canonical pipelines. No UI logic.
 *
 * Entry points:
 *   sendMedia(input)      — photo/video/file
 *   sendMediaBatch(input)  — multi-photo album
 */
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateMediaInput,
  buildLocalAttachment,
  buildOptimisticMediaMessage,
  type SendMediaInput,
} from "@/domains/orbit/pipelines/message/send-media.pipeline";
import { acquireSubmitLock } from "@/domains/orbit/guards/send-guard";
import { logMessageSendStarted } from "@/lib/observability/orbit-observability";

export interface MediaSendResult {
  ok: boolean;
  tempId?: string;
  attachmentId?: string;
  error?: string;
}

/**
 * sendMedia — Single media file send.
 * validate → local preview → local attachment → optimistic message → store merge
 */
export function sendMedia(input: SendMediaInput): MediaSendResult {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  const validationError = validateMediaInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  // Step 1: local preview
  const previewUrl = input.file.type.startsWith("image/")
    ? URL.createObjectURL(input.file)
    : null;

  // Step 2: canonical attachment
  const attachment = buildLocalAttachment(input, previewUrl);

  // Step 3: optimistic message
  const optimistic = buildOptimisticMediaMessage(input, attachment);

  // Step 4: merge into store
  const store = useOrbitStore.getState();
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
 * reconcileMediaUpload — Called when upload completes.
 * Updates attachment with remote URL + status.
 */
export function reconcileMediaUpload(
  attachmentId: string,
  remoteUrl: string,
): void {
  useOrbitStore.getState().updateAttachmentUpload(attachmentId, {
    remoteUrl,
    uploadStatus: "uploaded",
    uploadProgress: 100,
  });
}

/**
 * failMediaUpload — Called when upload fails.
 */
export function failMediaUpload(attachmentId: string): void {
  useOrbitStore.getState().updateAttachmentUpload(attachmentId, {
    uploadStatus: "failed",
  });
}

/**
 * retryMediaUpload — Reset attachment for re-upload.
 */
export function retryMediaUpload(attachmentId: string): void {
  useOrbitStore.getState().updateAttachmentUpload(attachmentId, {
    uploadStatus: "queued",
    uploadProgress: 0,
  });
}
