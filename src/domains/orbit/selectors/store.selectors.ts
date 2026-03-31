/**
 * Orbit Store Selectors — Zustand selector hooks for optimized reads.
 * These avoid repeated Object.values / filter / sort in render paths.
 *
 * OWNER: NO — read-only derived data.
 * SOURCE: orbitStore (canonical)
 */
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import type { OrbitMessage, OrbitConversation, OrbitAttachment } from "@/domains/orbit/types";

// ══════════════════════════════════════════════
// CONVERSATION SELECTORS
// ══════════════════════════════════════════════

/** All conversations as array (cached via Zustand shallow). */
export function useAllConversations(): OrbitConversation[] {
  return useOrbitStore((s) => Object.values(s.conversations));
}

/** Single conversation by ID. */
export function useConversation(id: string | null): OrbitConversation | undefined {
  return useOrbitStore((s) => id ? s.conversations[id] : undefined);
}

/** Total unread across all conversations. */
export function useTotalUnreadCount(): number {
  return useOrbitStore((s) => {
    let count = 0;
    for (const c of Object.values(s.conversations)) count += c.unreadCount;
    return count;
  });
}

// ══════════════════════════════════════════════
// MESSAGE SELECTORS
// ══════════════════════════════════════════════

/** Messages for a conversation, sorted chronologically. */
export function useConversationMessages(conversationId: string | null): OrbitMessage[] {
  return useOrbitStore((s) => {
    if (!conversationId) return [];
    const ids = s.messagesByConversation[conversationId] || [];
    const msgs = ids.map((id) => s.messages[id]).filter(Boolean);
    return msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

/** Pending messages for a conversation. */
export function usePendingMessages(conversationId: string | null): OrbitMessage[] {
  return useOrbitStore((s) => {
    if (!conversationId) return [];
    const ids = s.messagesByConversation[conversationId] || [];
    return ids
      .map((id) => s.messages[id])
      .filter((m): m is OrbitMessage => !!m && m.status === "sending");
  });
}

/** Failed messages for a conversation. */
export function useFailedMessages(conversationId: string | null): OrbitMessage[] {
  return useOrbitStore((s) => {
    if (!conversationId) return [];
    const ids = s.messagesByConversation[conversationId] || [];
    return ids
      .map((id) => s.messages[id])
      .filter((m): m is OrbitMessage => !!m && m.status === "failed");
  });
}

// ══════════════════════════════════════════════
// ATTACHMENT SELECTORS
// ══════════════════════════════════════════════

/** Single attachment by ID. */
export function useAttachment(id: string | null): OrbitAttachment | undefined {
  return useOrbitStore((s) => id ? s.attachments[id] : undefined);
}

/** All attachments for a message. */
export function useMessageAttachments(messageId: string | null): OrbitAttachment[] {
  return useOrbitStore((s) => {
    if (!messageId) return [];
    const msg = s.messages[messageId];
    if (!msg?.attachmentIds?.length) return [];
    return msg.attachmentIds.map((id) => s.attachments[id]).filter(Boolean);
  });
}

// ══════════════════════════════════════════════
// ACTIVE CONVERSATION
// ══════════════════════════════════════════════

/** Currently active conversation ID. */
export function useActiveConversationId(): string | null {
  return useOrbitStore((s) => s.activeConversationId);
}

/** Is the store hydrating? */
export function useIsHydrating(): boolean {
  return useOrbitStore((s) => s.hydrating);
}
