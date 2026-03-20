import { supabase } from "@/integrations/supabase/client";

// Use untyped client for orbit_profiles_v2 (not in auto-generated types)
const db = supabase as any;

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await db
    .from("orbit_profiles_v2")
    .select("id, orbit_id, email, display_name, avatar_url")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("findUserByEmail error", error);
    throw error;
  }

  return data;
}

export async function searchUsersByEmail(query: string, limit = 10) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const { data, error } = await db
    .from("orbit_profiles_v2")
    .select("id, orbit_id, email, display_name, avatar_url")
    .ilike("email", `%${trimmed}%`)
    .limit(limit);

  if (error) {
    console.error("searchUsersByEmail error", error);
    throw error;
  }

  return data ?? [];
}
