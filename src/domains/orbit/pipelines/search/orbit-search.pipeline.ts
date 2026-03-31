/**
 * orbitSearchPipeline — Canonical search across conversations and messages.
 * Implements debounce-ready, local-first search.
 */
import type { OrbitConversation, OrbitMessage } from "../../types";

export interface OrbitSearchResult {
  conversations: OrbitConversation[];
  messages: OrbitMessage[];
  query: string;
}

/**
 * Search conversations locally by title/participant name.
 */
export function searchConversationsLocal(
  conversations: OrbitConversation[],
  query: string,
): OrbitConversation[] {
  if (!query.trim()) return conversations;
  const q = query.toLowerCase().trim();
  return conversations.filter((c) => {
    if (c.title?.toLowerCase().includes(q)) return true;
    if (c.lastMessagePreview?.toLowerCase().includes(q)) return true;
    return false;
  });
}

/**
 * Search messages locally by text content.
 */
export function searchMessagesLocal(
  messages: OrbitMessage[],
  query: string,
): OrbitMessage[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return messages.filter((m) => m.text?.toLowerCase().includes(q));
}
