/**
 * boot.repository — Boot-time permission sync and health checks.
 */
import { supabase } from "@/integrations/supabase/client";

export async function syncOrbitPermissions(userId: string, perms: Record<string, boolean>) {
  await (supabase as any).from("orbit_profiles_v2").update({ permissions: perms } as any).eq("id", userId);
}

export async function healthCheckAuth() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session, error };
}

export function createHealthChannel(name: string) {
  return supabase.channel(name);
}

export function removeHealthChannel(channel: any) {
  supabase.removeChannel(channel);
}
