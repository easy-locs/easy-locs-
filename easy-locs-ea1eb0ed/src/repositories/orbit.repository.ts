/**
 * Orbit Repository — Orbit account actions, chat management, avatar.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchUserConversations(limit = 500) {
  const { data } = await cFrom("conversations_v2").select("id, participants").order("updated_at", { ascending: false }).limit(limit);
  return data || [];
}

/** @deprecated Use communication.repository.upsertConversationPreference instead */
export { upsertConversationPreference } from "@/repositories/communication.repository";

export async function fetchUserChatMessages(userId: string, limit = 1000) {
  const { data } = await cFrom("chat_messages_v2").select("body, created_at, sender_user_id").or(`sender_user_id.eq.${userId}`).order("created_at", { ascending: true }).limit(limit);
  return data || [];
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await db.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = db.storage.from("avatars").getPublicUrl(path);
  return publicUrl;
}

export async function updateAuthUser(data: Record<string, any>) {
  const { error } = await db.auth.updateUser({ data });
  if (error) throw error;
}

export async function updateProfileName(userId: string, name: string) {
  const { error } = await cFrom("profiles").update({ name } as any).eq("id", userId);
  if (error) throw error;
}
