import { supabase } from "@/integrations/supabase/client";

type EnsureOrbitProfileInput = {
  userId?: string;
  orbitId?: string | null;
  email?: string | null;
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
  let displayName = input.displayName ?? null;
  let avatarUrl = input.avatarUrl ?? null;

  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return null;
    userId = user.id;
    email = email ?? user.email?.trim().toLowerCase() ?? null;
    displayName = displayName ?? (user.user_metadata as any)?.display_name ?? null;
    avatarUrl = avatarUrl ?? (user.user_metadata as any)?.avatar_url ?? null;
  }

  // Skip DB call if already ensured this session
  if (ensuredCache.has(userId)) {
    return { id: userId, orbit_id: input.orbitId || `orbit_${userId.slice(0, 12)}` };
  }

  const row = {
    id: userId,
    orbit_id: input.orbitId || `orbit_${userId.slice(0, 12)}`,
    email,
    display_name: displayName,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("orbit_profiles_v2")
    .upsert(row as any, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("ensureOrbitProfile error", error);
    throw new Error(error.message || "Failed to ensure orbit profile");
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
