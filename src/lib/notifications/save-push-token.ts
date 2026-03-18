/**
 * savePushToken — Upsert a user's push token for ride/notification delivery.
 */
import { supabase } from "@/integrations/supabase/client";

export async function savePushToken(params: {
  userId: string;
  pushToken: string;
  platform?: string;
  deviceName?: string;
}) {
  const { userId, pushToken, platform = "web", deviceName } = params;

  const { error } = await supabase
    .from("user_push_tokens" as any)
    .upsert(
      {
        user_id: userId,
        push_token: pushToken,
        platform,
        device_name: deviceName ?? null,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id,push_token" } as any,
    );

  if (error) throw error;
  return { ok: true };
}
