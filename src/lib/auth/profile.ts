import { supabase } from "@/integrations/supabase/client";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Ensures a user_profiles row exists for the given user id.
 * Uses upsert with onConflict to avoid duplicates.
 * Safe to call on every login — no-op if row already exists.
 */
export async function ensureUserProfile(userId: string, meta?: { fullName?: string; phone?: string }) {
  const { error } = await (supabase as any)
    .from("user_profiles")
    .upsert(
      {
        id: userId,
        full_name: meta?.fullName || null,
        phone: meta?.phone || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  if (error) {
    console.warn("[ensureUserProfile] upsert failed:", error.message);
  }
}

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_profiles" as any)
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateMyProfile(params: {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  defaultWorkspaceId?: string | null;
  locale?: string;
  timezone?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const patch: Record<string, any> = {};
  if (typeof params.fullName === "string") patch.full_name = params.fullName;
  if (typeof params.phone === "string") patch.phone = params.phone;
  if (typeof params.avatarUrl === "string") patch.avatar_url = params.avatarUrl;
  if ("defaultWorkspaceId" in params) patch.default_workspace_id = params.defaultWorkspaceId ?? null;
  if (typeof params.locale === "string") patch.locale = params.locale;
  if (typeof params.timezone === "string") patch.timezone = params.timezone;

  const { data, error } = await supabase
    .from("user_profiles" as any)
    .update(patch)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
