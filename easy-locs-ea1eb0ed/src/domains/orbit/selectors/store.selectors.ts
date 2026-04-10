/**
 * Orbit Store Selectors — Zustand selector hooks for optimized reads.
 * These avoid repeated Object.values / filter / sort in render paths.
 *
 * OWNER: NO — read-only derived data.
 * SOURCE: orbitStore (canonical)
 */
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import type { OrbitMessage, OrbitConversation, OrbitAttachment } from "@/domains/orbit/types";

// ══════════════════════════════════════════════
// CONVERSATION SELECTORS
// ══════════════════════════════════════════════

/** All conversations as array (cached via Zustand shallow). */
export function useAllConversations(): OrbitConversation[] {
  return useOrbitMessagingStore((s) => Object.values(s.conversations));
}

/** Single conversation by ID. */
export function useConversation(id: string | null): OrbitConversation | undefined {
  return useOrbitMessagingStore((s) => id ? s.conversations[id] : undefined);
}

/** Total unread across all conversations. */
export function useTotalUnreadCount(): number {
  return useOrbitMessagingStore((s) => {
    let count = 0;
    for (const c of Object.values(s.conversations)) count += c.unreadCount;
    return count;
  });
}

// ══════════════════════════════════════════════
// MESSAGE SELECTORS
// ══════════════════════════════════════════════

/** Messages for a conversation, sorted chronologically. HARD-SCOPED by conversationId. */
export function useConversationMessages(conversationId: string | null): OrbitMessage[] {
  return useOrbitMessagingStore((s) => {
    if (!conversationId) return [];
    const ids = s.messagesByConversation[conversationId] || [];
    const msgs = ids
      .map((id) => s.messages[id])
      .filter((m): m is OrbitMessage => !!m && m.conversationId === conversationId);
    
    if (import.meta.env.DEV) {
      const rawMsgs = ids.map((id) => s.messages[id]).filter(Boolean);
      const foreign = rawMsgs.filter((m) => m.conversationId !== conversationId);
      if (foreign.length > 0) {
        console.error("[useConversationMessages] LEAK DETECTED", {
          conversationId, foreignCount: foreign.length,
          foreignIds: foreign.map((m) => m.id),
        });
      }
    }
    
    return msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

/** Pending messages for a conversation. */
export function usePendingMessages(conversationId: string | null): OrbitMessage[] {
  return useOrbitMessagingStore((s) => {
    if (!conversationId) return [];
    const ids = s.messagesByConversation[conversationId] || [];
    return ids
      .map((id) => s.messages[id])
      .filter((m): m is OrbitMessage => !!m && m.status === "sending");
  });
}

/** Failed messages for a conversation. */
export function useFailedMessages(conversationId: string | null): OrbitMessage[] {
  return useOrbitMessagingStore((s) => {
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
  return useOrbitMessagingStore((s) => id ? s.attachments[id] : undefined);
}

/** All attachments for a message. */
export function useMessageAttachments(messageId: string | null): OrbitAttachment[] {
  return useOrbitMessagingStore((s) => {
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
  return useOrbitMessagingStore((s) => s.activeConversationId);
}

/** Is the store hydrating? */
export function useIsHydrating(): boolean {
  return useOrbitMessagingStore((s) => s.hydrating);
}
