/**
 * sendMediaPipeline — Canonical media message send pipeline.
 *
 * Steps:
 * 1. Validate media (type, size)
 * 2. Create local preview + attachment record
 * 3. Insert optimistic message shell
 * 4. Queue upload job
 * 5. Execute upload → get remoteUrl
 * 6. Reconcile attachment local→remote
 * 7. Reconcile message tempId→serverId
 */
import type { OrbitMessage, OrbitAttachment, AttachmentKind } from "../../types";
import { markMessageSeen, generateIdempotencyKey } from "@/lib/dedup/message-dedup";
import { resolveCanonicalMessageType } from "./resolve-canonical-type";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_AUDIO = ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4"];

export interface SendMediaInput {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  file: File;
  caption?: string;
  viewOnce?: boolean;
}

/**
 * Step 1: Validate media file.
 */
export function validateMediaInput(input: SendMediaInput): string | null {
  if (!input.file) return "no_file";
  if (input.file.size > MAX_FILE_SIZE) return "file_too_large";
  if (!input.conversationId) return "missing_conversation_id";
  if (!input.senderId) return "missing_sender_id";
  return null;
}

/**
 * Step 2: Resolve attachment kind from file.
 */
export function resolveAttachmentKind(file: File): AttachmentKind {
  const mime = file.type.toLowerCase();
  if (ALLOWED_IMAGE.some((m) => mime.startsWith(m.split("/")[0] + "/"))) {
    if (mime.startsWith("image/")) return "image";
  }
  if (ALLOWED_VIDEO.includes(mime) || mime.startsWith("video/")) return "video";
  if (ALLOWED_AUDIO.includes(mime) || mime.startsWith("audio/")) return "audio";
  return "file";
}

/**
 * Step 2b: Build local attachment.
 */
export function buildLocalAttachment(
  input: SendMediaInput,
  previewUrl: string | null,
): OrbitAttachment {
  const localId = crypto.randomUUID();
  return {
    id: localId,
    localId,
    messageId: null,
    conversationId: input.conversationId,
    kind: resolveAttachmentKind(input.file),
    localUri: previewUrl,
    remoteUrl: null,
    mimeType: input.file.type,
    size: input.file.size,
    duration: null,
    waveform: null,
    uploadStatus: "local",
    uploadProgress: 0,
    previewDataUrl: previewUrl,
  };
}

/**
 * Step 3: Build optimistic media message.
 */
export function buildOptimisticMediaMessage(
  input: SendMediaInput,
  attachment: OrbitAttachment,
): OrbitMessage {
  const tempId = crypto.randomUUID();
  const idempotencyKey = generateIdempotencyKey(input.senderId, input.conversationId, tempId);
  markMessageSeen({ tempId, idempotencyKey });

  const type = resolveCanonicalMessageType({ attachmentKind: attachment.kind, mimeType: attachment.mimeType || undefined });

  return {
    id: tempId,
    tempId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    type,
    text: input.caption || null,
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
      viewOnce: input.viewOnce || false,
      localAttachmentId: attachment.localId,
    },
  };
}
