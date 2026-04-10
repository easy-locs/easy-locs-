/**
 * FAMILY: CHATS TAB — Canonical chat list state, filters, search, counters.
 * Single source of truth for the Chats tab runtime.
 */
import { create } from "zustand";

type ChatFilter = "all" | "unread" | "archived" | "pinned";

interface ChatsTabState {
  filter: ChatFilter;
  searchQuery: string;
  isSearching: boolean;
  setFilter: (f: ChatFilter) => void;
  setSearchQuery: (q: string) => void;
  setIsSearching: (v: boolean) => void;
  reset: () => void;
}

export const useChatsTabStore = create<ChatsTabState>((set) => ({
  filter: "all",
  searchQuery: "",
  isSearching: false,
  setFilter: (f) => set({ filter: f }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setIsSearching: (v) => set({ isSearching: v, searchQuery: v ? "" : "" }),
  reset: () => set({ filter: "all", searchQuery: "", isSearching: false }),
}));

export const ChatsTab = {
  /** Get unread count from conversations */
  getUnreadCount(conversations: Array<{ unread_count?: number }>): number {
    return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  },

  /** Filter conversations by current filter */
  applyFilter<T extends { is_archived?: boolean; is_pinned?: boolean; unread_count?: number }>(
    conversations: T[],
    filter: ChatFilter,
  ): T[] {
    switch (filter) {
      case "unread": return conversations.filter(c => (c.unread_count || 0) > 0);
      case "archived": return conversations.filter(c => c.is_archived);
      case "pinned": return conversations.filter(c => c.is_pinned);
      default: return conversations.filter(c => !c.is_archived);
    }
  },

  /** Search conversations by query */
  applySearch<T extends { display_name?: string; last_message_preview?: string }>(
    conversations: T[],
    query: string,
  ): T[] {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(c =>
      c.display_name?.toLowerCase().includes(q) ||
      c.last_message_preview?.toLowerCase().includes(q)
    );
  },
};
