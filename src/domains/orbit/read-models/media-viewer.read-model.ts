/**
 * MediaViewer Read Model — Pure projection for the fullscreen media viewer.
 * Combines attachment data + viewer source + save source.
 * No writes. No side effects.
 */

import {
  resolveMediaViewerSource,
  resolveMediaRenderableSource,
  type MediaSourceInput,
} from "@/domains/orbit/resolvers/media-source.resolver";

export interface MediaViewerReadModel {
  attachmentId: string;
  messageId: string;
  conversationId: string;
  mediaType: string;
  viewerSrc: string | null;
  thumbnailSrc: string | null;
  saveSrc: string | null;
  canSave: boolean;
  uploadStatus: string;
}

/**
 * Project attachment data into a viewer read model.
 * Pure function.
 */
export function selectMediaViewerModel(
  sourceInput: MediaSourceInput,
  meta: {
    attachmentId: string;
    messageId: string;
    conversationId: string;
    mediaType: string;
    uploadStatus?: string;
  },
): MediaViewerReadModel {
  const viewerSrc = resolveMediaViewerSource(sourceInput);
  const thumbnailSrc = resolveMediaRenderableSource(sourceInput);
  const saveSrc = viewerSrc; // save uses same source as viewer

  return {
    attachmentId: meta.attachmentId,
    messageId: meta.messageId,
    conversationId: meta.conversationId,
    mediaType: meta.mediaType,
    viewerSrc,
    thumbnailSrc,
    saveSrc,
    canSave: !!saveSrc,
    uploadStatus: meta.uploadStatus || "idle",
  };
}
