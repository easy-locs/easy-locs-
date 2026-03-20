import { supabase } from "@/integrations/supabase/client";

export async function ensureOrbitProfile() {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const email = user.email?.trim().toLowerCase() ?? null;

  const row = {
    id: user.id,
    orbit_id: `orbit_${user.id.slice(0, 12)}`,
    email,
    display_name: (user.user_metadata as any)?.display_name ?? null,
    avatar_url: (user.user_metadata as any)?.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("orbit_profiles_v2")
    .upsert(row as any, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("ensureOrbitProfile error", error);
    throw error;
  }

  return data;
}
