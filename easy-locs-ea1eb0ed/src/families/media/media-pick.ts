/**
 * media.pick — Canonical media picker family.
 * Single source of truth for photo/video/file selection.
 */

export type MediaPickSource = "camera" | "gallery" | "file";
export type MediaPickKind = "image" | "video" | "file" | "any";

export interface PickedMedia {
  file: File;
  localUrl: string;
  kind: "image" | "video" | "file";
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/mov", "video/quicktime"];

function classifyMime(mime: string): "image" | "video" | "file" {
  if (IMAGE_TYPES.some((t) => mime.startsWith(t.split("/")[0]) && mime.includes(t.split("/")[1]))) return "image";
  if (VIDEO_TYPES.some((t) => mime.startsWith(t.split("/")[0]))) return "video";
  return "file";
}

export const MediaPick = {
  /** Create a local preview URL for a picked file */
  createLocalPreview(file: File): string {
    return URL.revokeObjectURL ? URL.createObjectURL(file) : "";
  },

  /** Revoke a previously created local preview URL */
  revokeLocalPreview(url: string) {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  },

  /** Convert a raw File into a canonical PickedMedia */
  fromFile(file: File): PickedMedia {
    return {
      file,
      localUrl: URL.createObjectURL(file),
      kind: classifyMime(file.type),
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
  },

  /** Validate a picked file against size and type constraints */
  validate(media: PickedMedia, opts?: { maxSizeMB?: number; allowedKinds?: MediaPickKind[] }): string | null {
    const maxBytes = (opts?.maxSizeMB || 50) * 1024 * 1024;
    if (media.sizeBytes > maxBytes) {
      return `File too large (${(media.sizeBytes / 1024 / 1024).toFixed(1)}MB, max ${opts?.maxSizeMB || 50}MB)`;
    }
    if (opts?.allowedKinds && opts.allowedKinds.length > 0 && !opts.allowedKinds.includes(media.kind) && !opts.allowedKinds.includes("any")) {
      return `File type "${media.kind}" not allowed`;
    }
    return null;
  },

  /** Get accept string for file input based on kind */
  getAcceptString(kind: MediaPickKind): string {
    switch (kind) {
      case "image": return "image/*";
      case "video": return "video/*";
      case "file": return "*/*";
      case "any": return "image/*,video/*,application/*";
    }
  },
};
