/**
 * AttachmentRender Read Model — Pure projection for attachment rendering.
 * Resolves renderable + viewer sources canonically.
 * No writes. No side effects.
 */

import {
  resolveMediaRenderableSource,
  resolveMediaViewerSource,
  buildMediaSourceInput,
  type MediaSourceInput,
} from "@/domains/orbit/resolvers/media-source.resolver";

export interface AttachmentRenderReadModel {
  attachmentId: string;
  messageId: string;
  conversationId: string;
  kind: string;
  mimeType: string;
  renderSrc: string | null;
  viewerSrc: string | null;
  saveSrc: string | null;
  sourceInput: MediaSourceInput;
  uploadStatus: string;
  uploadProgress: number;
  fileName?: string;
  sizeBytes?: number;
}

/**
 * Project an attachment into a render read model.
 * Pure function.
 */
export function selectAttachmentRenderModel(
  attachment: {
    id: string;
    message_id?: string;
    messageId?: string;
    conversation_id?: string;
    conversationId?: string;
    kind?: string;
    type?: string;
    mime_type?: string;
    mimeType?: string;
    previewDataUrl?: string | null;
    preview_data_url?: string | null;
    localUri?: string | null;
    local_uri?: string | null;
    remoteUrl?: string | null;
    remote_url?: string | null;
    url?: string | null;
    upload_status?: string;
    uploadStatus?: string;
    upload_progress?: number;
    uploadProgress?: number;
    file_name?: string;
    fileName?: string;
    size_bytes?: number;
    sizeBytes?: number;
  },
  legacyAttachmentUrl?: string | null,
  legacyMetadata?: { media?: { url?: string } } | null,
): AttachmentRenderReadModel {
  const sourceInput = buildMediaSourceInput(
    {
      previewDataUrl: attachment.previewDataUrl ?? attachment.preview_data_url,
      localUri: attachment.localUri ?? attachment.local_uri,
      remoteUrl: attachment.remoteUrl ?? attachment.remote_url ?? attachment.url,
    },
    legacyAttachmentUrl,
    legacyMetadata,
  );

  return {
    attachmentId: attachment.id,
    messageId: attachment.message_id || attachment.messageId || "",
    conversationId: attachment.conversation_id || attachment.conversationId || "",
    kind: attachment.kind || attachment.type || "file",
    mimeType: attachment.mime_type || attachment.mimeType || "application/octet-stream",
    renderSrc: resolveMediaRenderableSource(sourceInput),
    viewerSrc: resolveMediaViewerSource(sourceInput),
    saveSrc: resolveMediaViewerSource(sourceInput), // save uses same priority as viewer
    sourceInput,
    uploadStatus: attachment.upload_status || attachment.uploadStatus || "idle",
    uploadProgress: attachment.upload_progress ?? attachment.uploadProgress ?? 0,
    fileName: attachment.file_name || attachment.fileName,
    sizeBytes: attachment.size_bytes ?? attachment.sizeBytes,
  };
}
