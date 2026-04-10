/**
 * orbit.ui.state — Ephemeral UI state for Orbit views.
 * Panel visibility, scroll positions.
 * Zero domain logic, zero persistence, zero events.
 *
 * NOTE: Composer state lives in composer.store.ts (single source of truth).
 * NOTE: Selection state lives in selection.store.ts (single source of truth).
 */
import { create } from "zustand";

export interface OrbitUIState {
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  scrollPosition: number;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setScrollPosition: (pos: number) => void;
  resetUI: () => void;
}

export const useOrbitUIState = create<OrbitUIState>((set) => ({
  isSidebarOpen: false,
  isSearchOpen: false,
  scrollPosition: 0,

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  resetUI: () =>
    set({
      isSidebarOpen: false,
      isSearchOpen: false,
      scrollPosition: 0,
    }),
}));
