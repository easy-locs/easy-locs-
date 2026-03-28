/**
 * Orbit Repository — Orbit account actions, chat management, avatar.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchUserConversations(limit = 500) {
  const { data } = await supabase.from("conversations_v2").select("id, participants").order("updated_at", { ascending: false }).limit(limit);
  return data || [];
}

export async function upsertConversationPreference(userId: string, contextId: string, prefs: Record<string, any>) {
  await supabase.from("conversation_preferences").upsert({ user_id: userId, context_id: contextId, ...prefs }, { onConflict: "user_id,context_id" });
}

export async function fetchUserChatMessages(userId: string, limit = 1000) {
  const { data } = await supabase.from("chat_messages_v2").select("body, created_at, sender_user_id").or(`sender_user_id.eq.${userId}`).order("created_at", { ascending: true }).limit(limit);
  return data || [];
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
  return publicUrl;
}

export async function updateAuthUser(data: Record<string, any>) {
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}

export async function updateProfileName(userId: string, name: string) {
  await supabase.from("profiles").update({ name } as any).eq("id", userId);
}
