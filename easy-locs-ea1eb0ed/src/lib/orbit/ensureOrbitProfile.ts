import { supabase } from "@/integrations/supabase/client";

export function generatePublicId(userId: string): string {
  return userId.replace(/-/g, "").substring(0, 8).toUpperCase();
}

type EnsureOrbitProfileInput = {
  userId?: string;
  orbitId?: string | null;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

/**
 * Session-level cache: once a profile is ensured for a userId,
 * skip the DB round-trip on subsequent calls.
 */
const ensuredCache = new Set<string>();

export async function ensureOrbitProfile(input: EnsureOrbitProfileInput = {}) {
  let userId = input.userId ?? null;
  let email = input.email?.trim().toLowerCase() ?? null;
  let phone = input.phone?.trim() ?? null;
  let displayName = input.displayName ?? null;
  let avatarUrl = input.avatarUrl ?? null;

  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return null;
    userId = user.id;
    email = email ?? user.email?.trim().toLowerCase() ?? null;
    phone = phone ?? (user.user_metadata as any)?.phone ?? user.phone ?? null;
    displayName = displayName ?? (user.user_metadata as any)?.display_name ?? null;
    avatarUrl = avatarUrl ?? (user.user_metadata as any)?.avatar_url ?? null;
  }

  // Skip DB call if already ensured this session
  if (ensuredCache.has(userId)) {
    return { id: userId, orbit_id: input.orbitId || `orbit_${userId.replace(/-/g, "").substring(0, 8)}` };
  }

  const row: Record<string, any> = {
    id: userId,
    orbit_id: input.orbitId || `orbit_${userId.replace(/-/g, "").substring(0, 8)}`,
    email,
    display_name: displayName,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };
  if (phone) row.phone = phone;

  const { data, error } = await supabase
    .from("orbit_profiles_v2")
    .upsert(row as any, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.warn("[ensureOrbitProfile] non-blocking error:", error.message);
    // Return a synthetic profile instead of throwing — login must never block on this
    return { id: userId, orbit_id: row.orbit_id };
  }

  ensuredCache.add(userId);
  return data;
}

/** Force re-check on next call (e.g. after profile update) */
export function invalidateOrbitProfileCache(userId?: string) {
  if (userId) {
    ensuredCache.delete(userId);
  } else {
    ensuredCache.clear();
  }
}
