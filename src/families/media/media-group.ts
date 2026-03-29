/**
 * media.group — Canonical grouped media family.
 * Handles: group builder, group preview, group send, group meta, group actions.
 */
import { create } from "zustand";
import type { PickedMedia } from "./media-pick";

// ── Group Builder ──

export interface MediaGroupItem {
  id: string;
  media: PickedMedia;
  caption?: string;
  order: number;
}

interface MediaGroupBuilderState {
  items: MediaGroupItem[];
  caption: string;
  add: (media: PickedMedia) => void;
  remove: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  setCaption: (caption: string) => void;
  clear: () => void;
}

export const useMediaGroupBuilder = create<MediaGroupBuilderState>((set) => ({
  items: [],
  caption: "",

  add: (media) =>
    set((s) => ({
      items: [
        ...s.items,
        {
          id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          media,
          order: s.items.length,
        },
      ],
    })),

  remove: (id) =>
    set((s) => ({
      items: s.items
        .filter((i) => i.id !== id)
        .map((i, idx) => ({ ...i, order: idx })),
    })),

  reorder: (fromIndex, toIndex) =>
    set((s) => {
      const items = [...s.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { items: items.map((i, idx) => ({ ...i, order: idx })) };
    }),

  setCaption: (caption) => set({ caption }),
  clear: () => set({ items: [], caption: "" }),
}));

// ── Group Meta ──

export interface GroupedMediaMeta {
  count: number;
  kinds: Set<string>;
  totalSizeBytes: number;
  hasImages: boolean;
  hasVideos: boolean;
  hasFiles: boolean;
}

export function buildGroupMeta(items: MediaGroupItem[]): GroupedMediaMeta {
  const kinds = new Set<string>();
  let totalSize = 0;
  let hasImages = false;
  let hasVideos = false;
  let hasFiles = false;

  for (const item of items) {
    kinds.add(item.media.kind);
    totalSize += item.media.sizeBytes;
    if (item.media.kind === "image") hasImages = true;
    if (item.media.kind === "video") hasVideos = true;
    if (item.media.kind === "file") hasFiles = true;
  }

  return { count: items.length, kinds, totalSizeBytes: totalSize, hasImages, hasVideos, hasFiles };
}

// ── Group Preview Helpers ──

export function getGroupPreviewLabel(meta: GroupedMediaMeta): string {
  const parts: string[] = [];
  if (meta.hasImages) parts.push(`${meta.count > 1 ? "" : ""}📷`);
  if (meta.hasVideos) parts.push("🎥");
  if (meta.hasFiles) parts.push("📎");
  return `${parts.join("")} ${meta.count} items`;
}

export function getGroupSendPreview(items: MediaGroupItem[], caption?: string): string {
  if (caption) return caption.slice(0, 80);
  const meta = buildGroupMeta(items);
  return getGroupPreviewLabel(meta);
}

// ── Group Send Payload ──

export interface GroupedSendPayload {
  attachments: {
    url: string;
    localUrl: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    order: number;
  }[];
  caption: string;
  count: number;
}

export function buildGroupedSendPayload(items: MediaGroupItem[], caption: string): GroupedSendPayload {
  return {
    attachments: items.map((item) => ({
      url: item.media.localUrl, // will be replaced with remote URL after upload
      localUrl: item.media.localUrl,
      kind: item.media.kind,
      mimeType: item.media.mimeType,
      sizeBytes: item.media.sizeBytes,
      order: item.order,
    })),
    caption,
    count: items.length,
  };
}

// ── Group Viewer State ──

interface GroupViewerState {
  isOpen: boolean;
  items: { url: string; kind: string }[];
  currentIndex: number;
  open: (items: { url: string; kind: string }[], startIndex?: number) => void;
  close: () => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
}

export const useGroupedMediaViewer = create<GroupViewerState>((set, get) => ({
  isOpen: false,
  items: [],
  currentIndex: 0,

  open: (items, startIndex = 0) =>
    set({ isOpen: true, items, currentIndex: startIndex }),

  close: () => set({ isOpen: false, items: [], currentIndex: 0 }),

  goTo: (index) => {
    const { items } = get();
    if (index >= 0 && index < items.length) set({ currentIndex: index });
  },

  next: () => {
    const { currentIndex, items } = get();
    if (currentIndex < items.length - 1) set({ currentIndex: currentIndex + 1 });
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },
}));

// ── Group Actions ──

export const MediaGroupActions = {
  /** Check if grouped delete is allowed */
  canDeleteGroup(isOwner: boolean): boolean {
    return isOwner;
  },

  /** Get available actions for a grouped media message */
  getGroupActions(opts: { isOwner: boolean; isAdmin?: boolean }) {
    const actions = ["open_viewer", "forward", "delete_self"];
    if (opts.isOwner || opts.isAdmin) actions.push("delete_all");
    actions.push("download_all");
    return actions;
  },
};
