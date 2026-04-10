import { useCallback } from "react";
import { db } from "@/services/db";

export function useOrbitViewOnce(params: { currentUserId?: string | null }) {
  const { currentUserId } = params;

  const markViewOnceOpened = useCallback(async (payload: {
    messageId: string;
    conversationId: string;
  }) => {
    if (!currentUserId) return;

    await db
      .from("orbit_media_open_logs")
      .insert({
        message_id: payload.messageId,
        conversation_id: payload.conversationId,
        opened_by_user_id: currentUserId,
      });
  }, [currentUserId]);

  return { markViewOnceOpened };
}
