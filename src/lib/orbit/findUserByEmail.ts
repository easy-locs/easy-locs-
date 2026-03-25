/**
 * findUserByEmail — Resolves email to user identity.
 * Uses public.profiles (authoritative identity source) and resolves the real orbit_id
 * from orbit_profiles_v2 to ensure consistency with the orbit ID format.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/**
 * Generates the canonical orbit_id from a user UUID.
 * Must match ensureOrbitProfile.ts logic: `orbit_${userId.slice(0, 12)}`
 */
function toOrbitId(userId: string): string {
  return `orbit_${userId.slice(0, 12)}`;
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await db
    .from("profiles")
    .select("id, email, name, first_name, last_name, username")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("findUserByEmail error", error);
    throw error;
  }

  if (!data) return null;

  // Also try to get the real orbit_id from orbit_profiles_v2
  let orbitId = toOrbitId(data.id);
  try {
    const { data: orbitRow } = await db
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", data.id)
      .maybeSingle();
    if (orbitRow?.orbit_id) {
      orbitId = orbitRow.orbit_id;
    }
  } catch {
    // Fallback to generated orbit_id
  }

  const displayName = data.name || [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || null;

  return {
    id: data.id,
    orbit_id: orbitId,
    email: data.email,
    display_name: displayName,
    avatar_url: null,
  };
}

export async function searchUsersByEmail(query: string, limit = 10) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, username, avatar_url")
    .ilike("email", `%${trimmed}%`)
    .limit(limit);

  if (error) {
    console.error("searchUsersByEmail error", error);
    throw error;
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    orbit_id: toOrbitId(d.id),
    email: d.email,
    display_name: d.full_name || d.username || null,
    avatar_url: d.avatar_url || null,
  }));
}
