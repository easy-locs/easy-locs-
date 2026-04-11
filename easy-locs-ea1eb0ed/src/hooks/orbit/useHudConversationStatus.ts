/**
 * useHudConversationStatus — Extracted from HudChatPanel.
 * Single responsibility: update conversation status (open/closed/archived).
 * PHASE 2: No direct Supabase — uses repository.
 */
import { useCallback, useRef } from "react";
import { updateConversationMetadata } from "@/repositories/communication.repository";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useHudConversationStatus(
  thread: ConversationThread | null,
  setConvStatus: (s: string) => void,
  onThreadUpdate: (conversationId: string, updates: Partial<ConversationThread>) => void,
) {
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const onThreadUpdateRef = useRef(onThreadUpdate);
  onThreadUpdateRef.current = onThreadUpdate;

  const updateConversationStatus = useCallback(async (status: string) => {
    const currentThread = threadRef.current;
    if (!currentThread) return;
    setConvStatus(status);
    onThreadUpdateRef.current(currentThread.id, { conversationStatus: status });
    const conversationId = currentThread.conversationId || currentThread.v2ConversationId;
    if (conversationId) {
      await updateConversationMetadata(conversationId, { conversation_status: status });
    }
  }, [setConvStatus]);

  return { updateConversationStatus };
}
