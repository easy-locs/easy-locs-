import { supabase } from "@/integrations/supabase/client";

export async function verifyAuthSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return { ok: true, reason: "Session active" };
    return { ok: false, reason: "No active session" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Auth check failed" };
  }
}

export async function verifyCurrentUserProfile() {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { ok: false, reason: "No authenticated user" };

    const { data: profile, error } = await (supabase as any)
      .from("user_profiles")
      .select("id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error) return { ok: false, reason: error.message };
    if (profile) return { ok: true, reason: "Profile found" };
    return { ok: false, reason: "User profile record missing" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Profile check failed" };
  }
}

export async function verifyRealtimeChannel() {
  try {
    const channel = supabase.channel("audit-health-check");
    await channel.subscribe();
    channel.unsubscribe();
    return { ok: true, reason: "Realtime channel subscribed/unsubscribed" };
  } catch (e: any) {
    return { ok: false, reason: e.message ?? "Realtime failed" };
  }
}
