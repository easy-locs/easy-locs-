/**
 * orbitSelectionStore — Single source of truth for message selection.
 * One conversation at a time. Purely local, never touches backend.
 */
import { create } from "zustand";

const EMPTY_SET: Set<string> = new Set();

interface SelectionState {
  mode: "idle" | "selecting";
  conversationId: string | null;
  selectedIds: Set<string>;
  lastSelectedId: string | null;

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
  selectedIds: EMPTY_SET,
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
      if (next.size === 0) {
        return { mode: "idle", conversationId: null, selectedIds: EMPTY_SET, lastSelectedId: null };
      }
      return { selectedIds: next, lastSelectedId: messageId };
    }),

  selectOnly: (messageId) =>
    set({
      selectedIds: new Set([messageId]),
      lastSelectedId: messageId,
    }),

  removeSelection: (messageId) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      next.delete(messageId);
      if (next.size === 0) {
        return { mode: "idle", conversationId: null, selectedIds: EMPTY_SET, lastSelectedId: null };
      }
      return { selectedIds: next };
    }),

  clearSelection: () =>
    set({
      mode: "idle",
      conversationId: null,
      selectedIds: EMPTY_SET,
      lastSelectedId: null,
    }),

  isSelected: (messageId) => get().selectedIds.has(messageId),
  selectedCount: () => get().selectedIds.size,
  getSelectedIds: () => [...get().selectedIds],
}));
