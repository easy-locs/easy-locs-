/**
 * FAMILY: ATTACHMENTS — Canonical attachment queue, upload, send, view-once.
 * Single source of truth for all attachment-related logic.
 */
export { useOrbitAttachmentQueue } from "@/hooks/useOrbitAttachmentQueue";
export { useOrbitUploadTransport } from "@/hooks/useOrbitUploadTransport";
export { useOrbitAttachmentSend } from "@/hooks/useOrbitAttachmentSend";
export { useOrbitViewOnce } from "@/hooks/useOrbitViewOnce";
export { useThreadAttachmentFamily } from "@/hooks/orbit/families/useThreadAttachmentFamily";

// Attachments family owns: file upload, camera, media preview, send queue,
// progress, view-once, attachment rendering model
