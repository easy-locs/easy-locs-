/**
 * orbit-account.repository — All DB operations for Orbit Account section.
 * Extracted from OrbitAccountSection. Zero UI logic.
 */
import { db } from "@/services/db";

/** Upload avatar to storage, return public URL */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }
  if (file.size === 0) {
    throw new Error("File is empty");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo must be under 5MB");

  const { data: sessionData } = await db.auth.getSession();
  const sessionUserId = sessionData?.session?.user?.id;
  if (sessionUserId && sessionUserId !== userId) {
    throw new Error("Upload path userId does not match authenticated session user.");
  }

  try {
    const { error: bucketError } = await db.storage.getBucket("avatars");
    if (bucketError) {
      console.warn("[uploadAvatar] Bucket check failed (continuing with upload):", bucketError.message);
    }
  } catch (bucketCheckErr) {
    console.warn("[uploadAvatar] Bucket check threw (continuing with upload):", bucketCheckErr);
  }

  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const doUpload = () =>
    db.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  let result = await doUpload();

  const isAuthOrRlsError = (err: typeof result.error): boolean => {
    if (!err) return false;
    const msg = err.message ?? "";
    if (/not authorized/i.test(msg)) return true;
    if (/row-level security/i.test(msg)) return true;
    if (/security policy/i.test(msg)) return true;
    const code =
      ("status" in err ? (err as Record<string, unknown>).status : undefined) ??
      ("statusCode" in err ? (err as Record<string, unknown>).statusCode : undefined);
    return code === 401 || code === 403;
  };

  if (isAuthOrRlsError(result.error)) {
    console.warn("[uploadAvatar] Auth/RLS error on first attempt, refreshing session and retrying");
    await db.auth.refreshSession();
    result = await doUpload();
  }

  if (result.error) {
    console.error("[uploadAvatar] Upload failed:", JSON.stringify(result.error, null, 2));
    const msg = result.error.message ?? "";
    if (/row-level security/i.test(msg) || /security policy/i.test(msg)) {
      throw new Error("Upload blocked by storage policy. Please try again or re-login.");
    }
    throw result.error;
  }

  const { data: { publicUrl } } = db.storage.from("avatars").getPublicUrl(path);
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

  const { error: authError } = await db.auth.updateUser({
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
  const { error: profileError } = await db("profiles").update(profileUpdate).eq("id", userId);
  if (profileError) console.warn("[saveProfile] profiles update:", profileError.message);

  const orbitUpdate: Record<string, any> = { display_name: data.displayName, avatar_url: data.avatarUrl };
  const { error: orbitError } = await db("orbit_profiles_v2" as any).update(orbitUpdate as any).eq("id", userId);
  if (orbitError) console.warn("[saveProfile] orbit_profiles_v2 update:", orbitError.message);
}

export async function updateAvatarOnly(userId: string, avatarUrl: string): Promise<void> {
  const { error: authError } = await db.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });
  if (authError) throw authError;

  const { error: orbitError } = await db("orbit_profiles_v2" as any).update({ avatar_url: avatarUrl } as any).eq("id", userId);
  if (orbitError) console.warn("[updateAvatarOnly] orbit_profiles_v2:", orbitError.message);
}

/** Archive all user conversations */
export async function archiveAllChats(userId: string): Promise<number> {
  const threads = await getUserThreadIds(userId);
  for (const id of threads) {
    await db("conversation_preferences").upsert(
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
    await db("conversation_preferences").upsert(
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
    await db("conversation_preferences").upsert(
      { user_id: userId, context_id: id, archived: true, cleared_at: new Date().toISOString() },
      { onConflict: "user_id,context_id" },
    );
  }
  return threads.length;
}

/** Export chat messages as text */
export async function exportChatHistory(userId: string): Promise<string> {
  const { data: messages } = await db("chat_messages_v2")
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
  const { count } = await db("blocked_users")
    .select("id", { count: "exact", head: true })
    .eq("blocker_id", userId);
  return count || 0;
}

// ── Internal ──
async function getUserThreadIds(userId: string): Promise<string[]> {
  const { data: threads } = await db("conversations_v2")
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
