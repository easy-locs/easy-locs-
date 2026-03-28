/**
 * useHudConversationStatus — Extracted from HudChatPanel.
 * Single responsibility: update conversation status (open/closed/archived).
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useHudConversationStatus(
  thread: ConversationThread | null,
  setConvStatus: (s: string) => void,
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void,
) {
  const updateConversationStatus = useCallback(async (status: string) => {
    if (!thread) return;
    setConvStatus(status);
    onThreadUpdate(thread.id, { conversationStatus: status });
    if (thread.v2ConversationId) {
      await (supabase as any).from("conversations_v2").update({
        metadata: { conversation_status: status },
        updated_at: new Date().toISOString(),
      }).eq("id", thread.v2ConversationId);
    }
  }, [thread, setConvStatus, onThreadUpdate]);

  return { updateConversationStatus };
}
