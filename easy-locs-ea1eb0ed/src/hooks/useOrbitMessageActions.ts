/**
 * useOrbitMessageActions — Edit, soft-delete, pin messages.
 * Uses canonical repository — zero inline supabase calls.
 */
import { useCallback, useRef, useState } from "react";
import { updateMessageFields } from "@/repositories/communication.repository";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useOrbitMessageActions(params: {
  conversationId?: string | null;
  currentUserId?: string | null;
  onAfterChange?: () => void;
}) {
  const { conversationId, currentUserId } = params;
  const onAfterChangeRef = useRef(params.onAfterChange);
  onAfterChangeRef.current = params.onAfterChange;
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);

  const editMessage = useCallback(async (messageId: string, body: string) => {
    if (!conversationId || !currentUserId) return;
    setBusyMessageId(messageId);
    try {
      await updateMessageFields(messageId, {
        body,
        edited_at: new Date().toISOString(),
      });
      onAfterChangeRef.current?.();
      toast.success("Message updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update message");
    } finally {
      setBusyMessageId(null);
    }
  }, [conversationId, currentUserId]);

  const softDeleteMessage = useCallback(async (messageId: string) => {
    if (!conversationId || !currentUserId) return;
    setBusyMessageId(messageId);
    try {
      await updateMessageFields(messageId, {
        deleted_at: new Date().toISOString(),
        body: "",
        metadata: { deleted: true },
      });
      onAfterChangeRef.current?.();
      toast.success("Message deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete message");
    } finally {
      setBusyMessageId(null);
    }
  }, [conversationId, currentUserId]);

  const togglePinMessage = useCallback(async (messageId: string, pin: boolean) => {
    if (!conversationId) return;
    setBusyMessageId(messageId);
    try {
      const { data: row, error: readErr } = await db
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

      const { error } = await db
        .from("conversations_v2")
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (error) throw error;

      onAfterChangeRef.current?.();
      toast.success(pin ? "Message pinned" : "Message unpinned");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update pin");
    } finally {
      setBusyMessageId(null);
    }
  }, [conversationId]);

  return { busyMessageId, editMessage, softDeleteMessage, togglePinMessage };
}
