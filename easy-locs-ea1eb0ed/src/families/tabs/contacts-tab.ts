/**
 * FAMILY: CONTACTS TAB — Canonical contacts list state, search, actions.
 * Single source of truth for the Contacts tab runtime.
 */
import { create } from "zustand";

type ContactsFilter = "all" | "favorites" | "recent";

interface ContactsTabState {
  filter: ContactsFilter;
  searchQuery: string;
  isSearching: boolean;
  setFilter: (f: ContactsFilter) => void;
  setSearchQuery: (q: string) => void;
  setIsSearching: (v: boolean) => void;
  reset: () => void;
}

export const useContactsTabStore = create<ContactsTabState>((set) => ({
  filter: "all",
  searchQuery: "",
  isSearching: false,
  setFilter: (f) => set({ filter: f }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setIsSearching: (v) => set({ isSearching: v, searchQuery: v ? "" : "" }),
  reset: () => set({ filter: "all", searchQuery: "", isSearching: false }),
}));

export const ContactsTab = {
  /** Search contacts by name/phone */
  applySearch<T extends { display_name?: string; phone?: string; email?: string }>(
    contacts: T[],
    query: string,
  ): T[] {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter(c =>
      c.display_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  },
};
