import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOrbitMessageActions(params: {
  conversationId?: string | null;
  currentUserId?: string | null;
  onAfterChange?: () => void;
}) {
  const { conversationId, currentUserId, onAfterChange } = params;
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);

  const editMessage = useCallback(async (messageId: string, body: string) => {
    if (!conversationId || !currentUserId) return;
    setBusyMessageId(messageId);
    try {
      const { error } = await (supabase as any)
        .from("chat_messages_v2")
        .update({
          body,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("conversation_id", conversationId)
        .eq("sender_user_id", currentUserId);

      if (error) throw error;
      onAfterChange?.();
      toast.success("Message updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update message");
    } finally {
      setBusyMessageId(null);
    }
  }, [conversationId, currentUserId, onAfterChange]);

  const softDeleteMessage = useCallback(async (messageId: string) => {
    if (!conversationId || !currentUserId) return;
    setBusyMessageId(messageId);
    try {
      const { error } = await (supabase as any)
        .from("chat_messages_v2")
        .update({
          deleted_at: new Date().toISOString(),
          body: "",
          metadata: { deleted: true },
        })
        .eq("id", messageId)
        .eq("conversation_id", conversationId)
        .eq("sender_user_id", currentUserId);

      if (error) throw error;
      onAfterChange?.();
      toast.success("Message deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete message");
    } finally {
      setBusyMessageId(null);
    }
  }, [conversationId, currentUserId, onAfterChange]);

  const togglePinMessage = useCallback(async (messageId: string, pin: boolean) => {
    if (!conversationId) return;
    setBusyMessageId(messageId);
    try {
      const { data: row, error: readErr } = await (supabase as any)
        .from("conversations_v2")
        .select("metadata")
        .eq("id", conversationId)
        .single();

      if (readErr) throw readErr;

      const metadata = { ...(row?.metadata || {}) };

      if (pin) {
        metadata.pinned_message_id = messageId;
        metadata.pinned_at = new Date().toISOString();
      } else {
        delete metadata.pinned_message_id;
        delete metadata.pinned_at;
      }

      const { error } = await (supabase as any)
        .from("conversations_v2")
        .update({
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (error) throw error;
      onAfterChange?.();
      toast.success(pin ? "Message pinned" : "Message unpinned");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update pin");
    } finally {
      setBusyMessageId(null);
    }
  }, [conversationId, onAfterChange]);

  return {
    busyMessageId,
    editMessage,
    softDeleteMessage,
    togglePinMessage,
  };
}
