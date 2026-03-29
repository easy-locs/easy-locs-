/**
 * FAMILY: GROUPS TAB — Canonical group list state, search, actions.
 * Single source of truth for the Groups tab runtime.
 */
import { create } from "zustand";

interface GroupsTabState {
  searchQuery: string;
  isSearching: boolean;
  isCreating: boolean;
  setSearchQuery: (q: string) => void;
  setIsSearching: (v: boolean) => void;
  setIsCreating: (v: boolean) => void;
  reset: () => void;
}

export const useGroupsTabStore = create<GroupsTabState>((set) => ({
  searchQuery: "",
  isSearching: false,
  isCreating: false,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setIsSearching: (v) => set({ isSearching: v }),
  setIsCreating: (v) => set({ isCreating: v }),
  reset: () => set({ searchQuery: "", isSearching: false, isCreating: false }),
}));
