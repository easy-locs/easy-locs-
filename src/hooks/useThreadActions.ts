/**
 * useThreadActions — Archive, delete, unarchive, mute, block, clear, and favorite conversation threads.
 * Persists to conversation_preferences / blocked_users tables with optimistic UI + rollback.
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

  const upsertPref = useCallback(async (
    thread: ConversationThread,
    updates: Record<string, unknown>
  ) => {
    if (!userId) throw new Error("No user");
    const contextId = thread.contextId || thread.id;
    const { error } = await supabase.from("conversation_preferences").upsert(
      {
        user_id: userId,
        context_id: contextId,
        ...updates,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id,context_id" }
    );
    if (error) throw error;
  }, [userId]);

  const archiveThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    updateThreadLocally(thread.id, { archived: true });
    try {
      await upsertPref(thread, { archived: true });
      toast.success(`"${thread.name}" archived`);
    } catch (e: any) {
      console.error("[archive] Failed:", e);
      updateThreadLocally(thread.id, { archived: false });
      toast.error("Failed to archive conversation");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  const unarchiveThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    updateThreadLocally(thread.id, { archived: false });
    try {
      await upsertPref(thread, { archived: false });
      toast.success(`"${thread.name}" unarchived`);
    } catch (e: any) {
      console.error("[unarchive] Failed:", e);
      updateThreadLocally(thread.id, { archived: true });
      toast.error("Failed to unarchive conversation");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  const deleteThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    updateThreadLocally(thread.id, { archived: true, muted: true });
    try {
      await upsertPref(thread, { archived: true, muted: true });
      toast.success(`"${thread.name}" deleted`);
    } catch (e: any) {
      console.error("[delete] Failed:", e);
      updateThreadLocally(thread.id, { archived: false, muted: false });
      toast.error("Failed to delete conversation");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  const muteThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const newMuted = !thread.muted;
    updateThreadLocally(thread.id, { muted: newMuted });
    try {
      await upsertPref(thread, { muted: newMuted });
      toast.success(newMuted ? `"${thread.name}" muted` : `"${thread.name}" unmuted`);
    } catch (e: any) {
      console.error("[mute] Failed:", e);
      updateThreadLocally(thread.id, { muted: !newMuted });
      toast.error("Failed to update mute setting");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  const blockThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const otherUserId = resolveOtherUserId(thread, userId);
    if (!otherUserId) {
      toast.error("Cannot identify user to block");
      return;
    }

    try {
      const { error } = await supabase.from("blocked_users").upsert({
        blocker_id: userId,
        blocked_id: otherUserId,
      } as any, { onConflict: "blocker_id,blocked_id" });
      if (error) throw error;

      updateThreadLocally(thread.id, { archived: true, muted: true });
      await upsertPref(thread, { archived: true, muted: true });
      toast.success(`${thread.name} blocked`);
    } catch (e: any) {
      console.error("[block] Failed:", e);
      toast.error("Failed to block user");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  /**
   * clearThread — "Clear chat for me" using cleared_at timestamp.
   * Messages before this timestamp are hidden for the current user only.
   * Does NOT modify or delete any messages — safe for the other participant.
   */
  const clearThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const prevLastMessage = thread.lastMessage;
    const prevUnread = thread.unreadCount;
    updateThreadLocally(thread.id, { lastMessage: undefined, unreadCount: 0 });
    try {
      await upsertPref(thread, { cleared_at: new Date().toISOString() });
      toast.success(`Chat with ${thread.name} cleared`);
    } catch (e: any) {
      console.error("[clear] Failed:", e);
      updateThreadLocally(thread.id, { lastMessage: prevLastMessage, unreadCount: prevUnread });
      toast.error("Failed to clear chat");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  /**
   * favoriteThread — Toggle favourite status with persistence.
   */
  const favoriteThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const wasFavorited = !!thread.pinned;
    const newFavorited = !wasFavorited;
    updateThreadLocally(thread.id, { pinned: newFavorited });
    try {
      await upsertPref(thread, { favorited: newFavorited });
      toast.success(newFavorited ? `"${thread.name}" added to favourites` : `"${thread.name}" removed from favourites`);
    } catch (e: any) {
      console.error("[favorite] Failed:", e);
      updateThreadLocally(thread.id, { pinned: wasFavorited });
      toast.error("Failed to update favourite");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  return { archiveThread, unarchiveThread, deleteThread, muteThread, blockThread, clearThread, favoriteThread };
}

/** Resolve the other participant's user ID from the thread */
function resolveOtherUserId(thread: ConversationThread, currentUserId: string): string | null {
  if (thread.contextId?.startsWith("direct:")) {
    const parts = thread.contextId.split(":");
    const id1 = parts[1];
    const id2 = parts[2];
    if (id1 && id2) {
      return id1 === currentUserId ? id2 : id1;
    }
  }
  return null;
}
