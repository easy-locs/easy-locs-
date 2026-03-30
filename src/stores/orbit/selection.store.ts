/**
 * orbitSelectionStore — Single source of truth for message selection.
 * One conversation at a time. Purely local, never touches backend.
 */
import { create } from "zustand";

interface SelectionState {
  mode: "idle" | "selecting";
  conversationId: string | null;
  selectedIds: Set<string>;
  lastSelectedId: string | null;

  // ── Actions ──
  enterSelectionMode: (conversationId: string, messageId: string) => void;
  toggleSelection: (messageId: string) => void;
  selectOnly: (messageId: string) => void;
  removeSelection: (messageId: string) => void;
  clearSelection: () => void;
  isSelected: (messageId: string) => boolean;
  selectedCount: () => number;
  getSelectedIds: () => string[];
}

export const useOrbitSelectionStore = create<SelectionState>((set, get) => ({
  mode: "idle",
  conversationId: null,
  selectedIds: new Set(),
  lastSelectedId: null,

  enterSelectionMode: (conversationId, messageId) =>
    set({
      mode: "selecting",
      conversationId,
      selectedIds: new Set([messageId]),
      lastSelectedId: messageId,
    }),

  toggleSelection: (messageId) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      // Exit selection mode if nothing left
      if (next.size === 0) {
        return { mode: "idle", conversationId: null, selectedIds: next, lastSelectedId: null };
      }
      return { selectedIds: next, lastSelectedId: messageId };
    }),

  selectOnly: (messageId) =>
    set((s) => ({
      selectedIds: new Set([messageId]),
      lastSelectedId: messageId,
    })),

  removeSelection: (messageId) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      next.delete(messageId);
      if (next.size === 0) {
        return { mode: "idle", conversationId: null, selectedIds: next, lastSelectedId: null };
      }
      return { selectedIds: next };
    }),

  clearSelection: () =>
    set({
      mode: "idle",
      conversationId: null,
      selectedIds: new Set(),
      lastSelectedId: null,
    }),

  isSelected: (messageId) => get().selectedIds.has(messageId),
  selectedCount: () => get().selectedIds.size,
  getSelectedIds: () => [...get().selectedIds],
}));
