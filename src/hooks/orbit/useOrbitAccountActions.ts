/**
 * useOrbitAccountActions — Chat management actions for OrbitAccountSection.
 * Single responsibility: archive, clear, delete, export chats + avatar upload.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function useOrbitAccountActions(userId: string | undefined) {
  const { t } = useI18n();

  const getUserThreads = useCallback(async () => {
    if (!userId) return [];
    const { data: threads } = await supabase
      .from("conversations_v2")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(500);
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
        await supabase.from("conversation_preferences").upsert({
          user_id: userId!, context_id: thread.id, archived: true,
        }, { onConflict: "user_id,context_id" });
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
        await supabase.from("conversation_preferences").upsert({
          user_id: userId!, context_id: thread.id, cleared_at: new Date().toISOString(),
        }, { onConflict: "user_id,context_id" });
      }
      toast.success(t("orbit.chats.clear_all") || "All chats cleared");
    }
  }, [getUserThreads, userId, t]);

  const deleteAll = useCallback(async () => {
    if (!confirm(t("orbit.delete_for_all_q") || "Delete all chats? This cannot be undone.")) return;
    const userThreads = await getUserThreads();
    if (userThreads.length > 0) {
      for (const thread of userThreads) {
        await supabase.from("conversation_preferences").upsert({
          user_id: userId!, context_id: thread.id, archived: true, cleared_at: new Date().toISOString(),
        }, { onConflict: "user_id,context_id" });
      }
      toast.success(t("orbit.chats.delete_all") || "All chats deleted");
    }
  }, [getUserThreads, userId, t]);

  const exportChat = useCallback(async () => {
    if (!userId) return;
    const { data: messages } = await supabase
      .from("chat_messages_v2")
      .select("body, created_at, sender_user_id")
      .or(`sender_user_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (!messages || messages.length === 0) {
      toast.info(t("orbit.no_conversations") || "No messages to export");
      return;
    }
    const text = messages.map((m: any) =>
      `[${new Date(m.created_at).toLocaleString()}] ${m.sender_user_id === userId ? "You" : "Contact"}: ${m.body}`
    ).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("orbit.chats.export") || "Chat exported");
  }, [userId, t]);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!userId) return null;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    toast.success("Photo uploaded!");
    return publicUrl;
  }, [userId]);

  const saveProfile = useCallback(async (displayName: string, avatarUrl: string) => {
    if (!userId) return;
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName, display_name: displayName, avatar_url: avatarUrl },
    });
    if (error) throw error;
    await supabase.from("profiles").update({ name: displayName }).eq("id", userId);
    toast.success(t("orbit.profile.save") || "Profile updated!");
  }, [userId, t]);

  return { archiveAll, clearAll, deleteAll, exportChat, uploadAvatar, saveProfile };
}
