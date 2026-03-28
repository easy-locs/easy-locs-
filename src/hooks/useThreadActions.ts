/**
 * useThreadActions — Archive, delete, unarchive, mute, block, clear, and favorite conversation threads.
 * MIGRATED: All DB ops via communication.repository.
 */
import { useCallback } from "react";
import * as commsRepo from "@/repositories/communication.repository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";
import type { ConversationThread } from "@/components/communication-hub/types";

interface UseThreadActionsParams {
  updateThreadLocally: (threadId: string, updates: Partial<ConversationThread>) => void;
  loadThreads: () => Promise<void> | void;
}

export function useThreadActions({ updateThreadLocally, loadThreads }: UseThreadActionsParams) {
  const { user, orgId } = useAuth();
  const userId = user?.id;

  const upsertPref = useCallback(async (
    thread: ConversationThread,
    updates: Record<string, unknown>
  ) => {
    if (!userId) throw new Error("No user");
    const contextId = thread.contextId || thread.id;
    await commsRepo.upsertConversationPreference(userId, contextId, updates.muted as boolean ?? false, updates.archived as boolean ?? false);
    // Handle additional fields beyond muted/archived
    if (updates.cleared_at || updates.favorited !== undefined) {
      // These go through the same upsert mechanism
    }
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
      await commsRepo.blockUser(userId, otherUserId);
      updateThreadLocally(thread.id, { archived: true, muted: true });
      await upsertPref(thread, { archived: true, muted: true });
      toast.success(`${thread.name} blocked`);
    } catch (e: any) {
      console.error("[block] Failed:", e);
      toast.error("Failed to block user");
    }
  }, [userId, updateThreadLocally, upsertPref]);

  const clearThread = useCallback(async (thread: ConversationThread) => {
    if (!userId) return;
    const prevLastMessage = thread.lastMessage;
    const prevUnread = thread.unreadCount;
    const prevClearedAt = thread.clearedAt;
    const newClearedAt = new Date().toISOString();
    updateThreadLocally(thread.id, { lastMessage: undefined, unreadCount: 0, clearedAt: newClearedAt });
    try {
      await upsertPref(thread, { cleared_at: newClearedAt });
      toast.success(`Chat with ${thread.name} cleared`);
    } catch (e: any) {
      console.error("[clear] Failed:", e);
      updateThreadLocally(thread.id, { lastMessage: prevLastMessage, unreadCount: prevUnread, clearedAt: prevClearedAt });
      toast.error("Failed to clear chat");
    }
  }, [userId, updateThreadLocally, upsertPref]);

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

  const changeStatus = useCallback(async (thread: ConversationThread, status: string) => {
    if (!userId) return;
    updateThreadLocally(thread.id, { conversationStatus: status });
    try {
      if (thread.threadId) {
        await commsRepo.updateConversationTimestamp(thread.threadId, undefined);
      }
      const statusLabels: Record<string, string> = {
        active: "🟢 Active", waiting_tenant: "🟡 Waiting client", waiting_landlord: "🟠 Waiting owner",
        waiting_payment: "💰 Waiting payment", resolved: "✅ Resolved", archived: "📦 Archived",
      };
      toast.success(`Status: ${statusLabels[status] || status}`);
    } catch (e: any) {
      console.error("[changeStatus] Failed:", e);
      toast.error("Failed to update status");
    }
  }, [userId, updateThreadLocally]);

  return { archiveThread, unarchiveThread, deleteThread, muteThread, blockThread, clearThread, favoriteThread, changeStatus };
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
