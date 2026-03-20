import { supabase } from "@/integrations/supabase/client";

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("orbit_profiles_v2")
    .select("id, orbit_id, email, display_name, avatar_url")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("findUserByEmail error", error);
    throw error;
  }

  return data;
}
