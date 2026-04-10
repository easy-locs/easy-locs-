/**
 * useThreadActions — Archive, delete, unarchive, mute, block, clear, favorite, markUnread.
 * All DB ops via communication.repository. Optimistic UI with rollback.
 */
import { useCallback } from "react";
import * as commsRepo from "@/repositories/communication.repository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { ConversationThread } from "@/components/communication-hub/types";

interface UseThreadActionsParams {
  updateThreadLocally: (threadId: string, updates: Partial<ConversationThread>) => void;
  loadThreads: () => Promise<void> | void;
}

export function useThreadActions({ updateThreadLocally, loadThreads }: UseThreadActionsParams) {
  const { user } = useAuth();
  const { t } = useI18n();
  const userId = user?.id;

  /** Helper: resolves contextId for preference upsert */
  const ctxId = (thread: ConversationThread) => thread.contextId || thread.id;

  const archiveThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    updateThreadLocally(thread.id, { archived: true });
    try {
      await commsRepo.upsertConversationPreference(userId, ctxId(thread), !!thread.muted, true);
      toast.success(t("orbit.archived_success", { name: thread.name }));
    } catch (e) {
      console.error("[archive] Failed:", e);
      updateThreadLocally(thread.id, { archived: false });
      toast.error(t("orbit.archive_failed"));
    }
  }, [userId, updateThreadLocally]);

  const unarchiveThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    updateThreadLocally(thread.id, { archived: false });
    try {
      await commsRepo.upsertConversationPreference(userId, ctxId(thread), !!thread.muted, false);
      toast.success(t("orbit.unarchived_success", { name: thread.name }));
    } catch (e) {
      console.error("[unarchive] Failed:", e);
      updateThreadLocally(thread.id, { archived: true });
      toast.error(t("orbit.unarchive_failed"));
    }
  }, [userId, updateThreadLocally]);

  const deleteThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const prevArchived = !!thread.archived;
    const prevMuted = !!thread.muted;
    updateThreadLocally(thread.id, { archived: true, muted: true });
    try {
      await commsRepo.upsertConversationPreference(userId, ctxId(thread), true, true);
      toast.success(t("orbit.deleted_success", { name: thread.name }));
    } catch (e) {
      console.error("[delete] Failed:", e);
      updateThreadLocally(thread.id, { archived: prevArchived, muted: prevMuted });
      toast.error(t("orbit.delete_failed"));
    }
  }, [userId, updateThreadLocally]);

  const muteThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const newMuted = !thread.muted;
    updateThreadLocally(thread.id, { muted: newMuted });
    try {
      await commsRepo.upsertConversationPreference(userId, ctxId(thread), newMuted, !!thread.archived);
      toast.success(newMuted ? t("orbit.muted_success", { name: thread.name }) : t("orbit.unmuted_success", { name: thread.name }));
    } catch (e) {
      console.error("[mute] Failed:", e);
      updateThreadLocally(thread.id, { muted: !newMuted });
      toast.error(t("orbit.mute_failed"));
    }
  }, [userId, updateThreadLocally]);

  const blockThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const otherUserId = resolveOtherUserId(thread, userId);
    if (!otherUserId) {
      toast.error(t("orbit.block_failed"));
      return;
    }
    const prevArchived = !!thread.archived;
    const prevMuted = !!thread.muted;
    updateThreadLocally(thread.id, { archived: true, muted: true });
    try {
      await commsRepo.blockUser(userId, otherUserId);
      await commsRepo.upsertConversationPreference(userId, ctxId(thread), true, true);
      toast.success(t("orbit.blocked_success", { name: thread.name }));
    } catch (e) {
      console.error("[block] Failed:", e);
      updateThreadLocally(thread.id, { archived: prevArchived, muted: prevMuted });
      toast.error(t("orbit.block_failed"));
    }
  }, [userId, updateThreadLocally]);

  const clearThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const prevLastMessage = thread.lastMessage;
    const prevUnread = thread.unreadCount;
    const prevClearedAt = thread.clearedAt;
    const newClearedAt = new Date().toISOString();
    updateThreadLocally(thread.id, { lastMessage: undefined, unreadCount: 0, clearedAt: newClearedAt });
    try {
      await commsRepo.upsertConversationPreference(
        userId, ctxId(thread), !!thread.muted, !!thread.archived,
        { cleared_at: newClearedAt }
      );
      toast.success(t("orbit.cleared_success", { name: thread.name }));
    } catch (e) {
      console.error("[clear] Failed:", e);
      updateThreadLocally(thread.id, { lastMessage: prevLastMessage, unreadCount: prevUnread, clearedAt: prevClearedAt });
      toast.error(t("orbit.clear_failed"));
    }
  }, [userId, updateThreadLocally]);

  const favoriteThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const wasFavorited = !!thread.pinned;
    const newFavorited = !wasFavorited;
    updateThreadLocally(thread.id, { pinned: newFavorited });
    try {
      await commsRepo.upsertConversationPreference(
        userId, ctxId(thread), !!thread.muted, !!thread.archived,
        { favorited: newFavorited }
      );
      toast.success(newFavorited ? t("orbit.favorited_success", { name: thread.name }) : t("orbit.unfavorited_success", { name: thread.name }));
    } catch (e) {
      console.error("[favorite] Failed:", e);
      updateThreadLocally(thread.id, { pinned: wasFavorited });
      toast.error(t("orbit.favorite_failed"));
    }
  }, [userId, updateThreadLocally]);

  const markUnread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    updateThreadLocally(thread.id, { unreadCount: Math.max(thread.unreadCount || 0, 1) });
    try {
      await commsRepo.upsertConversationPreference(
        userId, ctxId(thread), !!thread.muted, !!thread.archived,
        { marked_unread: true }
      );
      toast.success(t("orbit.marked_unread_success", { name: thread.name }));
    } catch (e) {
      console.error("[markUnread] Failed:", e);
      updateThreadLocally(thread.id, { unreadCount: thread.unreadCount });
      toast.error(t("orbit.mark_unread_failed"));
    }
  }, [userId, updateThreadLocally]);

  const changeStatus = useCallback(async (thread: ConversationThread, status: string) => {
    if (!userId) return;
    const prevStatus = thread.conversationStatus;
    updateThreadLocally(thread.id, { conversationStatus: status });
    try {
      if (thread.threadId) {
        await commsRepo.updateConversationTimestamp(thread.threadId, undefined);
      }
      toast.success(t("orbit.status_updated"));
    } catch (e) {
      console.error("[changeStatus] Failed:", e);
      updateThreadLocally(thread.id, { conversationStatus: prevStatus });
      toast.error(t("orbit.status_update_failed"));
    }
  }, [userId, updateThreadLocally]);

  return { archiveThread, unarchiveThread, deleteThread, muteThread, blockThread, clearThread, favoriteThread, changeStatus, markUnread };
}

function resolveOtherUserId(thread: ConversationThread, currentUserId: string): string | null {
  if (thread.contextId?.startsWith("direct:")) {
    const parts = thread.contextId.split(":");
    const id1 = parts[1];
    const id2 = parts[2];
    if (id1 && id2) return id1 === currentUserId ? id2 : id1;
  }
  if (thread.tenantId) return thread.tenantId;
  return null;
}
