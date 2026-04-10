/**
 * Orbit Composer — Canonical type definitions.
 * Single source of truth for all composer-related types.
 */

export interface ReplyDraft {
  msgId: string;
  content: string;
  senderName?: string;
}

export interface EditDraft {
  messageId: string;
  originalBody: string;
}

export interface AttachmentDraft {
  localId: string;
  file: File;
  previewUrl?: string;
  type: "image" | "video" | "file" | "audio";
  uploading?: boolean;
  progress?: number;
}

export interface VoiceDraft {
  url: string;
  blob: Blob;
  durationSeconds: number;
}

export type ComposerMode =
  | "idle"
  | "typing"
  | "replying"
  | "editing"
  | "voice"
  | "attachments"
  | "sending";
