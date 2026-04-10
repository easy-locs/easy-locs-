/**
 * media.preview-state — Canonical preview-before-send state.
 * Manages the queue of items selected for sending with preview, caption, remove, cancel.
 * Independent from composer and thread state to avoid rerenders.
 */
import { create } from "zustand";
import { MediaPick, type PickedMedia } from "./media-pick";

export interface PreviewItem {
  id: string;
  media: PickedMedia;
  caption: string;
  order: number;
  thumbnailUrl?: string;
}

interface MediaPreviewState {
  /** Whether the preview sheet is open */
  isOpen: boolean;
  /** Items staged for preview/send */
  items: PreviewItem[];
  /** Global caption (applies to all if no per-item caption) */
  globalCaption: string;
  /** View-once toggle */
  viewOnce: boolean;

  // ── Actions ──
  /** Open preview with files */
  openWithFiles: (files: FileList | File[]) => void;
  /** Open preview with pre-picked media */
  openWithMedia: (media: PickedMedia[]) => void;
  /** Add more files to existing preview */
  addFiles: (files: FileList | File[]) => void;
  /** Remove a single item */
  removeItem: (id: string) => void;
  /** Set caption for single item */
  setItemCaption: (id: string, caption: string) => void;
  /** Set global caption */
  setGlobalCaption: (caption: string) => void;
  /** Set view-once */
  setViewOnce: (viewOnce: boolean) => void;
  /** Reorder items */
  reorder: (fromIndex: number, toIndex: number) => void;
  /** Clear and close */
  cancel: () => void;
  /** Mark as closed after send (clears state) */
  markSent: () => void;
}

function filesToPreviewItems(files: File[], startOrder: number): PreviewItem[] {
  return files.map((file, idx) => {
    const media = MediaPick.fromFile(file);
    return {
      id: `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      media,
      caption: "",
      order: startOrder + idx,
      thumbnailUrl: media.kind === "image" ? media.localUrl : undefined,
    };
  });
}

function cleanup(items: PreviewItem[]) {
  for (const item of items) {
    if (item.media.localUrl?.startsWith("blob:")) {
      MediaPick.revokeLocalPreview(item.media.localUrl);
    }
  }
}

export const useMediaPreviewState = create<MediaPreviewState>((set, get) => ({
  isOpen: false,
  items: [],
  globalCaption: "",
  viewOnce: false,

  openWithFiles: (files) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    const items = filesToPreviewItems(arr, 0);
    set({ isOpen: true, items, globalCaption: "", viewOnce: false });
  },

  openWithMedia: (media) => {
    if (!media.length) return;
    const items: PreviewItem[] = media.map((m, idx) => ({
      id: `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${idx}`,
      media: m,
      caption: "",
      order: idx,
      thumbnailUrl: m.kind === "image" ? m.localUrl : m.thumbnailUrl,
    }));
    set({ isOpen: true, items, globalCaption: "", viewOnce: false });
  },

  addFiles: (files) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    const { items } = get();
    const newItems = filesToPreviewItems(arr, items.length);
    set({ items: [...items, ...newItems] });
  },

  removeItem: (id) => {
    const { items } = get();
    const removed = items.find((i) => i.id === id);
    if (removed) {
      cleanup([removed]);
    }
    const remaining = items
      .filter((i) => i.id !== id)
      .map((i, idx) => ({ ...i, order: idx }));
    if (remaining.length === 0) {
      set({ isOpen: false, items: [], globalCaption: "", viewOnce: false });
    } else {
      set({ items: remaining });
    }
  },

  setItemCaption: (id, caption) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, caption } : i)),
    })),

  setGlobalCaption: (globalCaption) => set({ globalCaption }),
  setViewOnce: (viewOnce) => set({ viewOnce }),

  reorder: (fromIndex, toIndex) =>
    set((s) => {
      const items = [...s.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { items: items.map((i, idx) => ({ ...i, order: idx })) };
    }),

  cancel: () => {
    const { items } = get();
    cleanup(items);
    set({ isOpen: false, items: [], globalCaption: "", viewOnce: false });
  },

  markSent: () => {
    // Don't revoke URLs — they're used by optimistic messages
    set({ isOpen: false, items: [], globalCaption: "", viewOnce: false });
  },
}));
