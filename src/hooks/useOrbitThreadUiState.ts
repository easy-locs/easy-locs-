import { useMemo } from "react";

export function useOrbitThreadUiState(params: {
  conversationType?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const { conversationType, metadata } = params;

  const isGroup = conversationType === "group";
  const pinnedMessageId = (metadata?.pinned_message_id as string | undefined) || null;
  const conversationStatus = (metadata?.conversation_status as string | undefined) || "active";

  return useMemo(() => {
    return {
      isGroup,
      pinnedMessageId,
      conversationStatus,
    };
  }, [isGroup, pinnedMessageId, conversationStatus]);
}
