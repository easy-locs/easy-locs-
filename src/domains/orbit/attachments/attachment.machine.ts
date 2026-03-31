/**
 * attachment.machine — State machine for attachment upload/download lifecycle.
 * Enforces strict transitions.
 */
import type { AttachmentUploadStatus } from "@/domains/orbit/types";

export type AttachmentDownloadStatus = "none" | "queued" | "downloading" | "downloaded" | "failed";

const UPLOAD_TRANSITIONS: Record<AttachmentUploadStatus, AttachmentUploadStatus[]> = {
  local: ["queued"],
  queued: ["uploading", "failed"],
  uploading: ["uploaded", "failed"],
  uploaded: [],
  failed: ["queued"], // retry
};

const DOWNLOAD_TRANSITIONS: Record<AttachmentDownloadStatus, AttachmentDownloadStatus[]> = {
  none: ["queued"],
  queued: ["downloading", "failed"],
  downloading: ["downloaded", "failed"],
  downloaded: [],
  failed: ["queued"], // retry
};

export function canTransitionUpload(from: AttachmentUploadStatus, to: AttachmentUploadStatus): boolean {
  return UPLOAD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionDownload(from: AttachmentDownloadStatus, to: AttachmentDownloadStatus): boolean {
  return DOWNLOAD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isUploadTerminal(status: AttachmentUploadStatus): boolean {
  return status === "uploaded";
}

export function isUploadRetryable(status: AttachmentUploadStatus): boolean {
  return status === "failed";
}
