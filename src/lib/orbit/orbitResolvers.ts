import { supabase } from "@/integrations/supabase/client";
import type { OrbitProfile } from "@/lib/types/orbit-chat";

export async function getMyOrbitProfile(): Promise<OrbitProfile | null> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const { data, error } = await (supabase as any)
    .from("orbit_profiles_v2")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("getMyOrbitProfile error", error);
    return null;
  }

  return data as OrbitProfile;
}

export async function getOrbitProfileByOrbitId(orbitId: string): Promise<OrbitProfile | null> {
  const { data, error } = await (supabase as any)
    .from("orbit_profiles_v2")
    .select("*")
    .eq("orbit_id", orbitId)
    .single();

  if (error) {
    console.error("getOrbitProfileByOrbitId error", error);
    return null;
  }

  return data as OrbitProfile;
}

export async function getOrbitProfileByEmail(email: string): Promise<OrbitProfile | null> {
  const { data, error } = await (supabase as any)
    .from("orbit_profiles_v2")
    .select("*")
    .ilike("email", email)
    .single();

  if (error) {
    console.error("getOrbitProfileByEmail error", error);
    return null;
  }

  return data as OrbitProfile;
}
