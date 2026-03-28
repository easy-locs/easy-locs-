/**
 * orbit-account.repository — All Supabase operations for Orbit Account section.
 * Extracted from OrbitAccountSection. Zero UI logic.
 */
import { supabase } from "@/integrations/supabase/client";

/** Upload avatar to storage, return public URL */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo must be under 5MB");
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
  return publicUrl;
}

/** Save profile (auth metadata + profiles table) */
export async function saveProfile(userId: string, displayName: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: displayName, display_name: displayName, avatar_url: avatarUrl },
  });
  if (error) throw error;
  await supabase.from("profiles").update({ name: displayName }).eq("id", userId);
}

/** Archive all user conversations */
export async function archiveAllChats(userId: string): Promise<number> {
  const threads = await getUserThreadIds(userId);
  for (const id of threads) {
    await supabase.from("conversation_preferences").upsert(
      { user_id: userId, context_id: id, archived: true },
      { onConflict: "user_id,context_id" },
    );
  }
  return threads.length;
}

/** Clear all user conversations */
export async function clearAllChats(userId: string): Promise<number> {
  const threads = await getUserThreadIds(userId);
  for (const id of threads) {
    await supabase.from("conversation_preferences").upsert(
      { user_id: userId, context_id: id, cleared_at: new Date().toISOString() },
      { onConflict: "user_id,context_id" },
    );
  }
  return threads.length;
}

/** Delete all user conversations */
export async function deleteAllChats(userId: string): Promise<number> {
  const threads = await getUserThreadIds(userId);
  for (const id of threads) {
    await supabase.from("conversation_preferences").upsert(
      { user_id: userId, context_id: id, archived: true, cleared_at: new Date().toISOString() },
      { onConflict: "user_id,context_id" },
    );
  }
  return threads.length;
}

/** Export chat messages as text */
export async function exportChatHistory(userId: string): Promise<string> {
  const { data: messages } = await supabase
    .from("chat_messages_v2")
    .select("body, created_at, sender_user_id")
    .or(`sender_user_id.eq.${userId}`)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (!messages?.length) return "";
  return messages.map((m: any) =>
    `[${new Date(m.created_at).toLocaleString()}] ${m.sender_user_id === userId ? "You" : "Contact"}: ${m.body}`
  ).join("\n");
}

/** Get blocked contacts count */
export async function getBlockedCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("blocked_users")
    .select("id", { count: "exact", head: true })
    .eq("blocker_id", userId);
  return count || 0;
}

// ── Internal ──
async function getUserThreadIds(userId: string): Promise<string[]> {
  const { data: threads } = await supabase
    .from("conversations_v2")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(500);
  return (threads || [])
    .filter((t: any) => {
      if (!Array.isArray(t.participants)) return false;
      return t.participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === userId);
    })
    .map((t: any) => t.id);
}
