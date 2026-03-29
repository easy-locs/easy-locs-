/**
 * useHudConversationStatus — Extracted from HudChatPanel.
 * Single responsibility: update conversation status (open/closed/archived).
 * PHASE 2: No direct Supabase — uses repository.
 */
import { useCallback } from "react";
import { updateConversationMetadata } from "@/repositories/communication.repository";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useHudConversationStatus(
  thread: ConversationThread | null,
  setConvStatus: (s: string) => void,
  onThreadUpdate: (conversationId: string, updates: Partial<ConversationThread>) => void,
) {
  const updateConversationStatus = useCallback(async (status: string) => {
    if (!thread) return;
    setConvStatus(status);
    onThreadUpdate(thread.id, { conversationStatus: status });
    const conversationId = thread.conversationId;
    if (conversationId) {
      await updateConversationMetadata(conversationId, { conversation_status: status });
    }
  }, [thread, setConvStatus, onThreadUpdate]);

  return { updateConversationStatus };
}
