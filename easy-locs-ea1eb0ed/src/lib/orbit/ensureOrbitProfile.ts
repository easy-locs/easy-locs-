import { db } from "@/services/db";

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

const PROFILE_TIMEOUT_MS = 8_000;

export async function ensureOrbitProfile(input: EnsureOrbitProfileInput = {}) {
  const withTimeout = <T>(promise: Promise<T>, label: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${PROFILE_TIMEOUT_MS}ms`)), PROFILE_TIMEOUT_MS)
      ),
    ]);

  let resolvedUserId: string | null = input.userId ?? null;

  try {
    let email = input.email?.trim().toLowerCase() ?? null;
    let phone = input.phone?.trim() ?? null;
    let displayName = input.displayName ?? null;
    let avatarUrl = input.avatarUrl ?? null;

    if (!resolvedUserId) {
      const { data: authData } = await withTimeout(db.auth.getUser(), "auth.getUser");
      const user = authData.user;
      if (!user) return null;
      resolvedUserId = user.id;
      email = email ?? user.email?.trim().toLowerCase() ?? null;
      const meta = user.user_metadata as Record<string, any> | undefined;
      phone = phone ?? meta?.phone ?? user.phone ?? null;
      displayName = displayName ?? meta?.display_name ?? meta?.full_name ?? meta?.name ?? null;
      avatarUrl = avatarUrl ?? meta?.avatar_url ?? null;
    }

    if (!displayName && resolvedUserId) {
      try {
        const { data: profileRow } = await db("profiles").select("name").eq("id", resolvedUserId).maybeSingle();
        if (profileRow?.name) displayName = profileRow.name;
      } catch {}
    }

    if (ensuredCache.has(resolvedUserId)) {
      return { id: resolvedUserId, orbit_id: input.orbitId || `orbit_${resolvedUserId.replace(/-/g, "").substring(0, 8)}` };
    }

    const row: Record<string, any> = {
      id: resolvedUserId,
      orbit_id: input.orbitId || `orbit_${resolvedUserId.replace(/-/g, "").substring(0, 8)}`,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      role: "user",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await withTimeout(
      db("orbit_profiles_v2").upsert(row as any, { onConflict: "id" }).select().single(),
      "orbit_profiles_v2.upsert"
    );

    if (error) {
      console.warn("[ensureOrbitProfile] non-blocking upsert error:", error.message);
      return { id: resolvedUserId, orbit_id: row.orbit_id };
    }

    ensuredCache.add(resolvedUserId);
    return data;
  } catch (err) {
    console.warn("[ensureOrbitProfile] caught exception — returning synthetic profile:", err instanceof Error ? err.message : err);
    if (!resolvedUserId) return null;
    return { id: resolvedUserId, orbit_id: input.orbitId || `orbit_${resolvedUserId.replace(/-/g, "").substring(0, 8)}` };
  }
}

/** Force re-check on next call (e.g. after profile update) */
export function invalidateOrbitProfileCache(userId?: string) {
  if (userId) {
    ensuredCache.delete(userId);
  } else {
    ensuredCache.clear();
  }
}
