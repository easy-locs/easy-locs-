/**
 * normalizeAttachment — Transform raw attachment data into OrbitAttachment.
 */
import type { OrbitAttachment, AttachmentKind, AttachmentUploadStatus } from "../types";

export function normalizeAttachment(raw: any): OrbitAttachment {
  return {
    id: raw.id || crypto.randomUUID(),
    localId: raw.localId || raw.local_id || null,
    messageId: raw.messageId || raw.message_id || null,
    conversationId: raw.conversationId || raw.conversation_id || "",
    kind: resolveKind(raw),
    localUri: raw.localUri || raw.local_uri || raw.preview_url || null,
    remoteUrl: raw.remoteUrl || raw.remote_url || raw.url || raw.attachment_url || null,
    mimeType: raw.mimeType || raw.mime_type || null,
    size: raw.size || raw.file_size || null,
    duration: raw.duration || raw.audio_duration_seconds || null,
    waveform: raw.waveform || null,
    uploadStatus: resolveUploadStatus(raw),
    uploadProgress: raw.uploadProgress || raw.progress || 0,
    previewDataUrl: raw.previewDataUrl || raw.preview_data_url || null,
  };
}

function resolveKind(raw: any): AttachmentKind {
  if (raw.kind && ["image", "video", "audio", "voice", "file", "thumbnail"].includes(raw.kind)) {
    return raw.kind;
  }
  const mime = (raw.mimeType || raw.mime_type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return raw.is_voice ? "voice" : "audio";
  return "file";
}

function resolveUploadStatus(raw: any): AttachmentUploadStatus {
  if (raw.uploadStatus) return raw.uploadStatus;
  if (raw.remoteUrl || raw.remote_url || raw.url) return "uploaded";
  if (raw.localUri || raw.local_uri) return "local";
  return "local";
}
