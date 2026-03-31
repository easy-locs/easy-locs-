/**
 * Conversation ViewModel Bridge — Projects a single conversation + messages for chat UI.
 *
 * OWNER: NO — read-only projection.
 * SOURCE: orbitStore
 * OUTPUT: stable props for chat thread rendering.
 */
import { useMemo } from "react";
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import type { OrbitMessage } from "@/domains/orbit/types";

export interface ConversationViewModel {
  conversationId: string;
  title: string;
  type: string;
  participantIds: string[];
  messages: OrbitMessage[];
  pendingMessages: OrbitMessage[];
  failedMessages: OrbitMessage[];
  hasMessages: boolean;
}

/**
 * useConversationViewModel — Read-only projection of a single conversation from orbitStore.
 */
export function useConversationViewModel(conversationId: string | null): ConversationViewModel | null {
  const conversation = useOrbitStore((s) => conversationId ? s.conversations[conversationId] : undefined);
  const messageIds = useOrbitStore((s) => conversationId ? s.messagesByConversation[conversationId] : undefined);
  const messagesMap = useOrbitStore((s) => s.messages);

  return useMemo(() => {
    if (!conversationId || !conversation) return null;

    const ids = messageIds || [];
    const all = ids.map((id) => messagesMap[id]).filter(Boolean);
    const sorted = [...all].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return ta - tb;
    });

    return {
      conversationId,
      title: conversation.title || "Conversation",
      type: conversation.type,
      participantIds: conversation.participantIds || [],
      messages: sorted,
      pendingMessages: sorted.filter((m) => m.status === "sending"),
      failedMessages: sorted.filter((m) => m.status === "failed"),
      hasMessages: sorted.length > 0,
    };
  }, [conversationId, conversation, messageIds, messagesMap]);
}
