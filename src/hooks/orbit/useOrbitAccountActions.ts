/**
 * useOrbitAccountActions — Chat management actions for OrbitAccountSection.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import * as orbitRepo from "@/repositories/orbit.repository";

export function useOrbitAccountActions(userId: string | undefined) {
  const { t } = useI18n();

  const getUserThreads = useCallback(async () => {
    if (!userId) return [];
    const threads = await orbitRepo.fetchUserConversations();
    return (threads || []).filter((th: any) => {
      if (Array.isArray((th as any).participants)) {
        return (th as any).participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === userId);
      }
      return false;
    });
  }, [userId]);

  const archiveAll = useCallback(async () => {
    const userThreads = await getUserThreads();
    if (userThreads.length > 0) {
      for (const thread of userThreads) {
        await orbitRepo.upsertConversationPreference(userId!, thread.id, { archived: true });
      }
      toast.success(`${userThreads.length} ${t("orbit.chats.archive_all") || "chats archived"}`);
    } else {
      toast.info(t("orbit.no_conversations") || "No conversations");
    }
  }, [getUserThreads, userId, t]);

  const clearAll = useCallback(async () => {
    const userThreads = await getUserThreads();
    if (userThreads.length > 0) {
      for (const thread of userThreads) {
        await orbitRepo.upsertConversationPreference(userId!, thread.id, { cleared_at: new Date().toISOString() });
      }
      toast.success(t("orbit.chats.clear_all") || "All chats cleared");
    }
  }, [getUserThreads, userId, t]);

  const deleteAll = useCallback(async () => {
    if (!confirm(t("orbit.delete_for_all_q") || "Delete all chats? This cannot be undone.")) return;
    const userThreads = await getUserThreads();
    if (userThreads.length > 0) {
      for (const thread of userThreads) {
        await orbitRepo.upsertConversationPreference(userId!, thread.id, { archived: true, cleared_at: new Date().toISOString() });
      }
      toast.success(t("orbit.chats.delete_all") || "All chats deleted");
    }
  }, [getUserThreads, userId, t]);

  const exportChat = useCallback(async () => {
    if (!userId) return;
    const messages = await orbitRepo.fetchUserChatMessages(userId);
    if (!messages || messages.length === 0) {
      toast.info(t("orbit.no_conversations") || "No messages to export"); return;
    }
    const text = messages.map((m: any) =>
      `[${new Date(m.created_at).toLocaleString()}] ${m.sender_user_id === userId ? "You" : "Contact"}: ${m.body}`
    ).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(t("orbit.chats.export") || "Chat exported");
  }, [userId, t]);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!userId) return null;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return null; }
    const publicUrl = await orbitRepo.uploadAvatar(userId, file);
    toast.success("Photo uploaded!");
    return publicUrl;
  }, [userId]);

  const saveProfile = useCallback(async (displayName: string, avatarUrl: string) => {
    if (!userId) return;
    await orbitRepo.updateAuthUser({ full_name: displayName, display_name: displayName, avatar_url: avatarUrl });
    await orbitRepo.updateProfileName(userId, displayName);
    toast.success(t("orbit.profile.save") || "Profile updated!");
  }, [userId, t]);

  return { archiveAll, clearAll, deleteAll, exportChat, uploadAvatar, saveProfile };
}
