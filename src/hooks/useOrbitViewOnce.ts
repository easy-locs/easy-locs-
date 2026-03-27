import { supabase } from "@/integrations/supabase/client";

export function useOrbitViewOnce(params: { currentUserId?: string | null }) {
  const { currentUserId } = params;

  const markViewOnceOpened = async (payload: {
    messageId: string;
    conversationId: string;
  }) => {
    if (!currentUserId) return;

    await (supabase as any)
      .from("orbit_media_open_logs")
      .insert({
        message_id: payload.messageId,
        conversation_id: payload.conversationId,
        opened_by_user_id: currentUserId,
      });
  };

  return { markViewOnceOpened };
}
