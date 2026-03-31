/**
 * orbitSearchPipeline — Canonical search across conversations and messages.
 * Uses normalizeSearchableText as the SINGLE search normalizer.
 */
import type { OrbitConversation, OrbitMessage } from "../../types";
import { normalizeSearchableText } from "../../resolvers/text.resolver";

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
  const q = normalizeSearchableText(query);
  if (!q) return conversations;
  return conversations.filter((c) => {
    if (normalizeSearchableText(c.title).includes(q)) return true;
    if (normalizeSearchableText(c.lastMessagePreview).includes(q)) return true;
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
  const q = normalizeSearchableText(query);
  if (!q) return [];
  return messages.filter((m) => normalizeSearchableText(m.text).includes(q));
}
