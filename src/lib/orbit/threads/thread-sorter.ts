/**
 * thread-sorter — Atomic unit: normalize and sort threads for display.
 * Single responsibility: name normalization + deterministic sort.
 */
import type { ConversationThread } from "@/components/communication-hub/types";

export function normalizeAndSort(threadMap: Map<string, ConversationThread>): ConversationThread[] {
  const allThreads = Array.from(threadMap.values()).map(t => ({
    ...t,
    name: typeof t.name === "string" ? t.name : (t.name ? String(t.name) : "Contact"),
  }));

  return allThreads.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    const at = a.lastMessageTime || "";
    const bt = b.lastMessageTime || "";
    return bt.localeCompare(at);
  });
}