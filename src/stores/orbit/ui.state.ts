/**
 * orbit.ui.state — Ephemeral UI state for Orbit views.
 * Composer drafts, panel visibility, scroll positions.
 * Zero domain logic, zero persistence, zero events.
 */
import { create } from "zustand";

export interface OrbitUIState {
  composerDraft: string;
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  scrollPosition: number;
  replyingToMessageId: string | null;

  setComposerDraft: (draft: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setScrollPosition: (pos: number) => void;
  setReplyingTo: (messageId: string | null) => void;
  resetUI: () => void;
}

export const useOrbitUIState = create<OrbitUIState>((set) => ({
  composerDraft: "",
  isSidebarOpen: false,
  isSearchOpen: false,
  scrollPosition: 0,
  replyingToMessageId: null,

  setComposerDraft: (draft) => set({ composerDraft: draft }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  setReplyingTo: (messageId) => set({ replyingToMessageId: messageId }),
  resetUI: () =>
    set({
      composerDraft: "",
      isSidebarOpen: false,
      isSearchOpen: false,
      scrollPosition: 0,
      replyingToMessageId: null,
    }),
}));
