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

export interface ProfileData {
  displayName: string;
  avatarUrl: string;
  bio?: string;
  phone?: string;
  city?: string;
  firstName?: string;
  lastName?: string;
}

/** Save profile (auth metadata + profiles + orbit_profiles_v2 for full propagation) */
export async function saveProfile(userId: string, displayNameOrData: string | ProfileData, avatarUrl?: string): Promise<void> {
  const data: ProfileData = typeof displayNameOrData === "string"
    ? { displayName: displayNameOrData, avatarUrl: avatarUrl ?? "" }
    : displayNameOrData;

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: data.displayName,
      display_name: data.displayName,
      avatar_url: data.avatarUrl,
      ...(data.firstName !== undefined && { first_name: data.firstName }),
      ...(data.lastName !== undefined && { last_name: data.lastName }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.city !== undefined && { city: data.city }),
    },
  });
  if (authError) throw authError;

  const profileUpdate: Record<string, any> = { name: data.displayName };
  if (data.firstName !== undefined) profileUpdate.first_name = data.firstName;
  if (data.lastName !== undefined) profileUpdate.last_name = data.lastName;
  if (data.phone !== undefined) profileUpdate.phone = data.phone;
  const { error: profileError } = await supabase.from("profiles").update(profileUpdate).eq("id", userId);
  if (profileError) console.warn("[saveProfile] profiles update:", profileError.message);

  const orbitUpdate: Record<string, any> = { display_name: data.displayName, avatar_url: data.avatarUrl };
  const { error: orbitError } = await supabase.from("orbit_profiles_v2" as any).update(orbitUpdate as any).eq("user_id", userId);
  if (orbitError) console.warn("[saveProfile] orbit_profiles_v2 update:", orbitError.message);
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
