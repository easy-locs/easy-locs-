/**
 * attachment.normalizer — Normalize raw DB/API attachment payloads into canonical OrbitAttachment.
 */
import type { OrbitAttachment, AttachmentKind, AttachmentUploadStatus } from "@/domains/orbit/types";

interface RawAttachmentPayload {
  id?: string;
  message_id?: string;
  conversation_id?: string;
  file_type?: string;
  mime_type?: string;
  url?: string;
  file_url?: string;
  attachment_url?: string;
  size?: number;
  file_size?: number;
  duration?: number;
  width?: number;
  height?: number;
  waveform?: number[];
  local_uri?: string;
  preview_data_url?: string;
  upload_status?: string;
}

function resolveKind(mimeType: string | null | undefined): AttachmentKind {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function resolveUploadStatus(raw: string | undefined): AttachmentUploadStatus {
  const valid: AttachmentUploadStatus[] = ["local", "queued", "uploading", "uploaded", "failed"];
  if (raw && valid.includes(raw as AttachmentUploadStatus)) return raw as AttachmentUploadStatus;
  return "uploaded"; // default for server-side attachments
}

export function normalizeAttachment(raw: RawAttachmentPayload): OrbitAttachment {
  const mime = raw.mime_type || raw.file_type || null;
  const remoteUrl = raw.url || raw.file_url || raw.attachment_url || null;

  return {
    id: raw.id || crypto.randomUUID(),
    localId: null,
    messageId: raw.message_id || null,
    conversationId: raw.conversation_id || "",
    kind: resolveKind(mime),
    localUri: raw.local_uri || null,
    remoteUrl,
    mimeType: mime,
    size: raw.size || raw.file_size || null,
    duration: raw.duration || null,
    waveform: raw.waveform || null,
    uploadStatus: resolveUploadStatus(raw.upload_status),
    uploadProgress: remoteUrl ? 100 : 0,
    previewDataUrl: raw.preview_data_url || null,
  };
}
