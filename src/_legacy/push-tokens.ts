import { supabase } from "@/integrations/supabase/client";

async function tryGetCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function registerPushDeviceToken(params: {
  platform: "ios" | "android" | "web";
  provider?: "fcm" | "apns" | "webpush";
  deviceToken: string;
}) {
  const userId = await tryGetCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await (supabase as any)
    .from("push_device_tokens")
    .insert({
      user_id: userId,
      platform: params.platform,
      provider: params.provider ?? "fcm",
      device_token: params.deviceToken,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deactivatePushDeviceToken(id: string) {
  const { data, error } = await (supabase as any)
    .from("push_device_tokens")
    .update({ is_active: false, last_seen_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
