/**
 * media.upload — Canonical media upload pipeline.
 * Handles: queue, progress, retry, cancel, final URL resolution.
 */
import { create } from "zustand";

export type UploadStatus = "queued" | "uploading" | "completed" | "failed" | "cancelled";

export interface UploadItem {
  id: string;
  file: File;
  localPreviewUrl: string;
  status: UploadStatus;
  progress: number; // 0-100
  remoteUrl?: string;
  error?: string;
  retryCount: number;
  conversationId?: string;
}

interface UploadQueueState {
  items: UploadItem[];
  enqueue: (item: Omit<UploadItem, "status" | "progress" | "retryCount">) => void;
  updateProgress: (id: string, progress: number) => void;
  markCompleted: (id: string, remoteUrl: string) => void;
  markFailed: (id: string, error: string) => void;
  markCancelled: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  getByConversation: (conversationId: string) => UploadItem[];
}

export const useMediaUploadQueue = create<UploadQueueState>((set, get) => ({
  items: [],

  enqueue: (item) =>
    set((s) => ({
      items: [...s.items, { ...item, status: "queued", progress: 0, retryCount: 0 }],
    })),

  updateProgress: (id, progress) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, status: "uploading" as const, progress } : i)),
    })),

  markCompleted: (id, remoteUrl) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "completed" as const, progress: 100, remoteUrl } : i,
      ),
    })),

  markFailed: (id, error) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, status: "failed" as const, error } : i)),
    })),

  markCancelled: (id) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, status: "cancelled" as const } : i)),
    })),

  retry: (id) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "queued" as const, progress: 0, error: undefined, retryCount: i.retryCount + 1 } : i,
      ),
    })),

  remove: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  clear: () => set({ items: [] }),

  getByConversation: (conversationId) =>
    get().items.filter((i) => i.conversationId === conversationId),
}));

export const MediaUpload = {
  /** Generate a unique upload ID */
  generateId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  /** Check if any uploads are in progress for a conversation */
  hasActiveUploads(conversationId: string): boolean {
    const items = useMediaUploadQueue.getState().getByConversation(conversationId);
    return items.some((i) => i.status === "queued" || i.status === "uploading");
  },

  /** Get failed uploads for retry */
  getFailedUploads(conversationId?: string): UploadItem[] {
    const items = useMediaUploadQueue.getState().items;
    const filtered = conversationId
      ? items.filter((i) => i.conversationId === conversationId)
      : items;
    return filtered.filter((i) => i.status === "failed");
  },
};
