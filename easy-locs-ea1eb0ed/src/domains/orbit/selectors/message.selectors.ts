/**
 * Message Selectors — Derived data from orbit store for message rendering.
 */
import type { OrbitMessage } from "../types";

/**
 * Sort messages chronologically (ascending).
 */
export function selectSortedMessages(messages: OrbitMessage[]): OrbitMessage[] {
  return [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Get messages for a specific conversation.
 */
export function selectMessagesByConversation(
  messages: OrbitMessage[],
  conversationId: string,
): OrbitMessage[] {
  return messages.filter((m) => m.conversationId === conversationId && !m.isDeleted);
}

/**
 * Get pending (sending) messages for a conversation.
 */
export function selectPendingMessages(
  messages: OrbitMessage[],
  conversationId: string,
): OrbitMessage[] {
  return messages.filter(
    (m) => m.conversationId === conversationId && m.status === "sending",
  );
}

/**
 * Get failed messages for retry UI.
 */
export function selectFailedMessages(
  messages: OrbitMessage[],
  conversationId: string,
): OrbitMessage[] {
  return messages.filter(
    (m) => m.conversationId === conversationId && m.status === "failed",
  );
}

/**
 * Get last message for a conversation.
 */
export function selectLastMessage(
  messages: OrbitMessage[],
  conversationId: string,
): OrbitMessage | null {
  const sorted = selectSortedMessages(
    messages.filter((m) => m.conversationId === conversationId && !m.isDeleted),
  );
  return sorted[sorted.length - 1] || null;
}
