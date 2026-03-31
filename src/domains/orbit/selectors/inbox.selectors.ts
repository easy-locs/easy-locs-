/**
 * Inbox Selectors — Derived data from orbit store for inbox rendering.
 * These are the ONLY read path for inbox UI components.
 */
import type { OrbitConversation } from "../types";

/**
 * Sort conversations by last activity.
 */
export function selectSortedConversations(conversations: OrbitConversation[]): OrbitConversation[] {
  return [...conversations].sort((a, b) => {
    const ta = a.lastMessageAt || a.updatedAt || a.createdAt;
    const tb = b.lastMessageAt || b.updatedAt || b.createdAt;
    return tb.localeCompare(ta);
  });
}

/**
 * Filter conversations by kind.
 */
export function selectByKind(
  conversations: OrbitConversation[],
  kind: OrbitConversation["kind"],
): OrbitConversation[] {
  return conversations.filter((c) => c.kind === kind);
}

/**
 * Select unread conversations.
 */
export function selectUnread(conversations: OrbitConversation[]): OrbitConversation[] {
  return conversations.filter((c) => c.unreadCount > 0);
}

/**
 * Get total unread count across all conversations.
 */
export function selectTotalUnreadCount(conversations: OrbitConversation[]): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

/**
 * Select non-archived, non-muted conversations.
 */
export function selectActiveConversations(conversations: OrbitConversation[]): OrbitConversation[] {
  return conversations.filter((c) => !c.isArchived);
}
