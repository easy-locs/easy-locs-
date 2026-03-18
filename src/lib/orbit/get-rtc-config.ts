/**
 * WebRTC ICE config loader — fetches STUN/TURN from rtc_config table.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getRTCConfig() {
  const { data, error } = await supabase
    .from("rtc_config" as any)
    .select("*")
    .eq("enabled", true)
    .limit(1)
    .single();

  if (error || !data) {
    return {
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    };
  }

  const row = data as any;
  const iceServers: RTCIceServer[] = [];

  if (row.stun_urls?.length) {
    iceServers.push({ urls: row.stun_urls });
  }

  if (row.turn_urls?.length) {
    iceServers.push({
      urls: row.turn_urls,
      username: row.turn_username ?? undefined,
      credential: row.turn_password ?? undefined,
    });
  }

  return { iceServers };
}
