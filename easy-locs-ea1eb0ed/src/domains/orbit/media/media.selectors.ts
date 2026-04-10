/**
 * media.selectors — Fine-grained selectors for media/attachment state.
 * UI reads through these only — never from raw store.
 */
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import type { OrbitAttachment, AttachmentUploadStatus } from "@/domains/orbit/types";

/** Get all attachments for a message */
export function selectAttachmentsForMessage(messageId: string): OrbitAttachment[] {
  const state = useOrbitMessagingStore.getState();
  const msg = state.messages[messageId];
  if (!msg) return [];
  return msg.attachmentIds
    .map((id) => state.attachments[id])
    .filter(Boolean);
}

/** Get single attachment by ID */
export function selectAttachment(attachmentId: string): OrbitAttachment | undefined {
  return useOrbitMessagingStore.getState().attachments[attachmentId];
}

/** Get all pending uploads for a conversation */
export function selectPendingUploads(conversationId: string): OrbitAttachment[] {
  const attachments = Object.values(useOrbitMessagingStore.getState().attachments);
  return attachments.filter(
    (a) =>
      a.conversationId === conversationId &&
      (a.uploadStatus === "local" || a.uploadStatus === "queued" || a.uploadStatus === "uploading"),
  );
}

/** Get all failed uploads for a conversation */
export function selectFailedUploads(conversationId: string): OrbitAttachment[] {
  const attachments = Object.values(useOrbitMessagingStore.getState().attachments);
  return attachments.filter(
    (a) => a.conversationId === conversationId && a.uploadStatus === "failed",
  );
}

/** Check if any upload is active for a conversation */
export function hasActiveUploads(conversationId: string): boolean {
  return selectPendingUploads(conversationId).length > 0;
}

/** Get upload progress for an attachment (0-100) */
export function selectUploadProgress(attachmentId: string): number {
  return useOrbitMessagingStore.getState().attachments[attachmentId]?.uploadProgress ?? 0;
}

/** Get the display URL for an attachment (local preview or remote) */
export function selectAttachmentDisplayUrl(attachmentId: string): string | null {
  const att = useOrbitMessagingStore.getState().attachments[attachmentId];
  if (!att) return null;
  return att.remoteUrl || att.localUri || att.previewDataUrl || null;
}
