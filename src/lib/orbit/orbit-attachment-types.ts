export type OrbitAttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "file"
  | "pdf"
  | "location"
  | "contact";

export interface OrbitAttachmentItem {
  id: string;
  kind: OrbitAttachmentKind;
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  viewOnce?: boolean;
}

export interface OrbitUploadQueueItem {
  localId: string;
  file: File;
  kind: OrbitAttachmentKind;
  previewUrl?: string | null;
  progress: number;
  status: "queued" | "uploading" | "uploaded" | "failed";
  uploadedUrl?: string | null;
  errorMessage?: string | null;
}
