/**
 * media.upload — Canonical media upload pipeline with full lifecycle.
 * States: queued → preparing → compressing → uploading → processing → completed | failed | cancelled | retrying
 * Supports optimistic message ID binding for reconciliation.
 */
import { create } from "zustand";

export type UploadStatus =
  | "queued"
  | "preparing"
  | "compressing"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export interface UploadItem {
  id: string;
  file: File;
  localPreviewUrl: string;
  thumbnailUrl?: string;
  status: UploadStatus;
  progress: number; // 0-100
  remoteUrl?: string;
  error?: string;
  retryCount: number;
  conversationId?: string;
  /** Bound optimistic message ID for reconciliation */
  optimisticMessageId?: string;
  mediaKind: "image" | "video" | "file" | "audio";
  /** Video duration in seconds */
  duration?: number;
  /** File size in bytes */
  fileSize: number;
  createdAt: number;
}

interface UploadQueueState {
  items: UploadItem[];
  enqueue: (item: Omit<UploadItem, "status" | "progress" | "retryCount" | "createdAt">) => void;
  updateStatus: (id: string, status: UploadStatus) => void;
  updateProgress: (id: string, progress: number) => void;
  setThumbnail: (id: string, thumbnailUrl: string) => void;
  bindOptimisticId: (id: string, optimisticMessageId: string) => void;
  markCompleted: (id: string, remoteUrl: string) => void;
  markFailed: (id: string, error: string) => void;
  markCancelled: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  getByConversation: (conversationId: string) => UploadItem[];
  getActive: () => UploadItem[];
  getPending: () => UploadItem[];
}

export const useMediaUploadQueue = create<UploadQueueState>((set, get) => ({
  items: [],

  enqueue: (item) =>
    set((s) => ({
      items: [
        ...s.items,
        { ...item, status: "queued" as const, progress: 0, retryCount: 0, createdAt: Date.now() },
      ],
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, status } : i)),
    })),

  updateProgress: (id, progress) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "uploading" as const, progress } : i,
      ),
    })),

  setThumbnail: (id, thumbnailUrl) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, thumbnailUrl } : i)),
    })),

  bindOptimisticId: (id, optimisticMessageId) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, optimisticMessageId } : i)),
    })),

  markCompleted: (id, remoteUrl) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "completed" as const, progress: 100, remoteUrl } : i,
      ),
    })),

  markFailed: (id, error) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "failed" as const, error } : i,
      ),
    })),

  markCancelled: (id) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "cancelled" as const } : i,
      ),
    })),

  retry: (id) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? { ...i, status: "retrying" as const, progress: 0, error: undefined, retryCount: i.retryCount + 1 }
          : i,
      ),
    })),

  remove: (id) =>
    set((s) => {
      const item = s.items.find((i) => i.id === id);
      if (item?.localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.localPreviewUrl);
      }
      return { items: s.items.filter((i) => i.id !== id) };
    }),

  clear: () =>
    set((s) => {
      // Revoke all blob URLs
      for (const item of s.items) {
        if (item.localPreviewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(item.localPreviewUrl);
        }
      }
      return { items: [] };
    }),

  getByConversation: (conversationId) =>
    get().items.filter((i) => i.conversationId === conversationId),

  getActive: () =>
    get().items.filter((i) =>
      ["queued", "preparing", "compressing", "uploading", "processing", "retrying"].includes(i.status),
    ),

  getPending: () =>
    get().items.filter((i) => i.status === "queued" || i.status === "retrying"),
}));

export const MediaUpload = {
  generateId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  hasActiveUploads(conversationId: string): boolean {
    return useMediaUploadQueue
      .getState()
      .getByConversation(conversationId)
      .some((i) => ["queued", "preparing", "compressing", "uploading", "processing", "retrying"].includes(i.status));
  },

  getFailedUploads(conversationId?: string): UploadItem[] {
    const items = useMediaUploadQueue.getState().items;
    const filtered = conversationId
      ? items.filter((i) => i.conversationId === conversationId)
      : items;
    return filtered.filter((i) => i.status === "failed");
  },

  /** Detect media kind from file */
  detectMediaKind(file: File): "image" | "video" | "audio" | "file" {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  },

  /** Generate a video thumbnail from a File using canvas */
  async generateVideoThumbnail(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        const url = URL.createObjectURL(file);
        video.src = url;
        video.currentTime = 1; // seek to 1s for thumbnail
        video.onloadeddata = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(video.videoWidth, 320);
            canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            URL.revokeObjectURL(url);
            resolve(dataUrl);
          } catch {
            URL.revokeObjectURL(url);
            resolve(null);
          }
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        // Timeout fallback
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(null);
        }, 5000);
      } catch {
        resolve(null);
      }
    });
  },

  /** Get video duration from file */
  async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        const url = URL.createObjectURL(file);
        video.src = url;
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(Math.round(video.duration));
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(0);
        }, 5000);
      } catch {
        resolve(0);
      }
    });
  },
};
