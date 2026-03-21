/**
 * findUserByEmail — Resolves email to user identity.
 * Uses public.profiles (authoritative identity source) instead of orbit_profiles_v2.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, username, avatar_url")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("findUserByEmail error", error);
    throw error;
  }

  if (!data) return null;

  // Normalize to the shape consumers expect
  return {
    id: data.id,
    orbit_id: data.id, // profiles.id IS the user_id / orbit_id
    email: data.email,
    display_name: data.full_name || data.username || null,
    avatar_url: data.avatar_url || null,
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
    orbit_id: d.id,
    email: d.email,
    display_name: d.full_name || d.username || null,
    avatar_url: d.avatar_url || null,
  }));
}
