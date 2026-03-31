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
  // SCOPED read: only messages referenced by this conversation's bucket — NOT the full map
  const scopedMessages = useOrbitStore((s) => {
    if (!conversationId) return {};
    const ids = s.messagesByConversation[conversationId] || [];
    const scoped: Record<string, OrbitMessage> = {};
    for (const id of ids) {
      if (s.messages[id]) scoped[id] = s.messages[id];
    }
    return scoped;
  });

  return useMemo(() => {
    if (!conversationId || !conversation) return null;

    const ids = messageIds || [];
    const all = ids.map((id) => scopedMessages[id]).filter(Boolean);
    
    // DEV assertion: verify every message belongs to this conversation
    if (import.meta.env.DEV) {
      const foreign = all.filter((m) => m.conversationId !== conversationId);
      if (foreign.length > 0) {
        console.error("[ConversationViewModel] FOREIGN MESSAGES DETECTED in conversation", {
          conversationId,
          foreignIds: foreign.map((m) => m.id),
          foreignConvIds: foreign.map((m) => m.conversationId),
        });
      }
    }
    
    const sorted = [...all]
      .filter((m) => m.conversationId === conversationId) // hard filter — never leak
      .sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return ta - tb;
      });

    return {
      conversationId,
      title: conversation.title || "Conversation",
      type: conversation.kind,
      participantIds: conversation.participantIds || [],
      messages: sorted,
      pendingMessages: sorted.filter((m) => m.status === "sending"),
      failedMessages: sorted.filter((m) => m.status === "failed"),
      hasMessages: sorted.length > 0,
    };
  }, [conversationId, conversation, messageIds, scopedMessages]);
}
