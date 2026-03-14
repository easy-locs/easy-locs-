/**
 * useThreadActions — Archive, delete, and unarchive conversation threads.
 * Persists to conversation_preferences table and updates local state.
 * Archives/deletes the CONVERSATION (thread), not individual messages.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ConversationThread } from "@/components/communication-hub/types";

interface UseThreadActionsParams {
  updateThreadLocally: (threadId: string, updates: Partial<ConversationThread>) => void;
  loadThreads: () => Promise<void> | void;
}

export function useThreadActions({ updateThreadLocally, loadThreads }: UseThreadActionsParams) {
  const { user } = useAuth();
  const userId = user?.id;

  /**
   * Archive a conversation thread.
   * - Thread disappears from normal list
   * - Appears in "Archived" filter
   * - Unread count preserved
   * - New incoming message will auto-unarchive (handled by loadThreads)
   */
  const archiveThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;

    // Optimistic UI update
    updateThreadLocally(thread.id, { archived: true });

    try {
      // Persist to conversation_preferences
      const contextId = thread.contextId || thread.id;
      const { error } = await supabase.from("conversation_preferences").upsert(
        {
          user_id: userId,
          context_id: contextId,
          archived: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,context_id" }
      );

      if (error) throw error;
      toast.success(`"${thread.name}" archived`);
    } catch (e: any) {
      console.error("[archive] Failed:", e);
      // Rollback
      updateThreadLocally(thread.id, { archived: false });
      toast.error("Failed to archive conversation");
    }
  }, [userId, updateThreadLocally]);

  /**
   * Unarchive a conversation thread.
   */
  const unarchiveThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;

    updateThreadLocally(thread.id, { archived: false });

    try {
      const contextId = thread.contextId || thread.id;
      const { error } = await supabase.from("conversation_preferences").upsert(
        {
          user_id: userId,
          context_id: contextId,
          archived: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,context_id" }
      );

      if (error) throw error;
      toast.success(`"${thread.name}" unarchived`);
    } catch (e: any) {
      console.error("[unarchive] Failed:", e);
      updateThreadLocally(thread.id, { archived: true });
      toast.error("Failed to unarchive conversation");
    }
  }, [userId, updateThreadLocally]);

  /**
   * Delete (hide) a conversation thread for the current user.
   * This is a soft-delete: the thread is archived + muted.
   * Messages are NOT deleted from DB (other participants keep them).
   */
  const deleteThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;

    // Optimistic: remove from list
    updateThreadLocally(thread.id, { archived: true, muted: true });

    try {
      const contextId = thread.contextId || thread.id;
      const { error } = await supabase.from("conversation_preferences").upsert(
        {
          user_id: userId,
          context_id: contextId,
          archived: true,
          muted: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,context_id" }
      );

      if (error) throw error;
      toast.success(`"${thread.name}" deleted`);
    } catch (e: any) {
      console.error("[delete] Failed:", e);
      updateThreadLocally(thread.id, { archived: false, muted: false });
      toast.error("Failed to delete conversation");
    }
  }, [userId, updateThreadLocally]);

  return { archiveThread, unarchiveThread, deleteThread };
}
