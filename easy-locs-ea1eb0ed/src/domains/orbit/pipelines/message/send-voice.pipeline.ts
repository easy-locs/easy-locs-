/**
 * sendVoicePipeline — Canonical voice note send pipeline.
 *
 * Steps:
 * 1. Validate recording
 * 2. Build local voice attachment
 * 3. Build optimistic message
 * 4. Queue upload
 * 5. Reconcile
 */
import type { OrbitMessage, OrbitAttachment } from "../../types";
import { markMessageSeen, generateIdempotencyKey } from "@/lib/dedup/message-dedup";

export interface SendVoiceInput {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  blob: Blob;
  durationSeconds: number;
  localUrl: string;
  waveform?: number[];
}

export function validateVoiceInput(input: SendVoiceInput): string | null {
  if (!input.blob) return "no_audio_blob";
  if (!input.conversationId) return "missing_conversation_id";
  if (!input.senderId) return "missing_sender_id";
  if (input.durationSeconds <= 0) return "invalid_duration";
  if (input.blob.size > 25 * 1024 * 1024) return "file_too_large";
  return null;
}

export function buildLocalVoiceAttachment(input: SendVoiceInput): OrbitAttachment {
  const localId = crypto.randomUUID();
  return {
    id: localId,
    localId,
    messageId: null,
    conversationId: input.conversationId,
    kind: "voice",
    localUri: input.localUrl,
    remoteUrl: null,
    mimeType: "audio/webm",
    size: input.blob.size,
    duration: input.durationSeconds,
    waveform: input.waveform || null,
    uploadStatus: "local",
    uploadProgress: 0,
    previewDataUrl: null,
  };
}

export function buildOptimisticVoiceMessage(
  input: SendVoiceInput,
  attachment: OrbitAttachment,
): OrbitMessage {
  const tempId = crypto.randomUUID();
  const idempotencyKey = generateIdempotencyKey(input.senderId, input.conversationId, tempId);
  markMessageSeen({ tempId, idempotencyKey });

  return {
    id: tempId,
    tempId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    type: "voice",
    text: null,
    attachmentIds: [attachment.id],
    replyToId: null,
    reactionSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    status: "sending",
    isDeleted: false,
    isEdited: false,
    metadata: {
      tempId,
      idempotencyKey,
      schemaVersion: 1,
      durationSeconds: input.durationSeconds,
      localAttachmentId: attachment.localId,
    },
  };
}
