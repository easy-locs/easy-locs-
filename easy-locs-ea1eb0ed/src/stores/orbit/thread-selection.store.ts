import { create } from "zustand";
import type { ConversationThread } from "@/components/communication-hub/types";

interface ThreadSelectionState {
  selectedThread: ConversationThread | null;
  selectThread: (thread: ConversationThread | null) => void;
  updateSelectedThread: (updates: Partial<ConversationThread>) => void;
  clearThread: () => void;
}

export const useThreadSelectionStore = create<ThreadSelectionState>((set, get) => ({
  selectedThread: null,

  selectThread: (thread) => set({ selectedThread: thread }),

  updateSelectedThread: (updates) =>
    set((s) => {
      if (!s.selectedThread) return s;
      const keys = Object.keys(updates) as (keyof ConversationThread)[];
      const changed = keys.some((k) => s.selectedThread![k] !== updates[k]);
      if (!changed) return s;
      return { selectedThread: { ...s.selectedThread, ...updates } };
    }),

  clearThread: () => set({ selectedThread: null }),
}));
